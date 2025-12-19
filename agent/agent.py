import asyncio
import logging
import httpx
from typing import Optional

from livekit import rtc
from livekit.agents import (
    AutoSubscribe,
    JobContext,
    JobProcess,
    WorkerOptions,
    cli,
    llm,
)
from livekit.agents.pipeline import VoicePipelineAgent
from livekit.plugins import deepgram, openai, elevenlabs

from config import Config
from tools import check_availability, book_tour

logger = logging.getLogger("truvo-agent")
logger.setLevel(logging.INFO)


async def fetch_agent_config(room_name: str) -> dict:
    """Fetch agent configuration from the Next.js dashboard API.

    The room name typically contains an agent ID that maps to a specific
    agent template in the database.
    """
    try:
        # Extract agent ID from room name (format: "agent-{id}-{session}")
        parts = room_name.split("-")
        if len(parts) >= 2 and parts[0] == "agent":
            agent_id = parts[1]
        else:
            agent_id = None

        if agent_id:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{Config.NEXT_API_URL}/api/agents/{agent_id}/config",
                    timeout=5.0
                )
                if response.status_code == 200:
                    return response.json()
    except Exception as e:
        logger.warning(f"Failed to fetch agent config: {e}. Using defaults.")

    # Return default config if API call fails
    return {
        "system_prompt": Config.DEFAULT_SYSTEM_PROMPT,
        "greeting": Config.DEFAULT_GREETING,
        "voice_id": Config.DEFAULT_VOICE_ID,
        "tools_enabled": ["check_availability", "book_tour"]
    }


def get_enabled_tools(tool_names: list) -> list:
    """Get the list of enabled function tools based on configuration."""
    available_tools = {
        "check_availability": check_availability,
        "book_tour": book_tour,
    }
    return [available_tools[name] for name in tool_names if name in available_tools]


def prewarm(proc: JobProcess):
    """Prewarm function - loads models before accepting jobs for faster cold starts."""
    proc.userdata["vad"] = deepgram.VAD.load()


async def entrypoint(ctx: JobContext):
    """Main entrypoint for the voice agent.

    This function is called when a new participant joins a room.
    It sets up the voice pipeline and handles the conversation.
    """
    logger.info(f"Agent joining room: {ctx.room.name}")

    # Fetch agent configuration from dashboard API
    config = await fetch_agent_config(ctx.room.name)
    logger.info(f"Loaded config - Voice: {config.get('voice_id')}, Tools: {config.get('tools_enabled')}")

    # Wait for a participant to connect
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    participant: Optional[rtc.RemoteParticipant] = None
    for p in ctx.room.remote_participants.values():
        participant = p
        break

    if not participant:
        logger.info("Waiting for participant to join...")
        participant = await ctx.wait_for_participant()

    logger.info(f"Participant joined: {participant.identity}")

    # Initialize the voice pipeline components

    # Speech-to-Text: Deepgram Nova-2 for high accuracy
    stt = deepgram.STT(
        model="nova-2",
        language="en",
    )

    # LLM: GPT-4o-mini for fast, cost-effective responses
    llm_instance = openai.LLM(
        model="gpt-4o-mini",
        temperature=0.7,
    )

    # Text-to-Speech: ElevenLabs for natural voice
    tts = elevenlabs.TTS(
        voice=config.get("voice_id", Config.DEFAULT_VOICE_ID),
        model="eleven_turbo_v2_5",  # Optimized for low latency
    )

    # Build the function context with enabled tools
    fnc_ctx = llm.FunctionContext()
    enabled_tools = get_enabled_tools(config.get("tools_enabled", []))
    for tool in enabled_tools:
        fnc_ctx.register(tool)

    # Create the Voice Pipeline Agent
    agent = VoicePipelineAgent(
        vad=ctx.proc.userdata.get("vad") or deepgram.VAD.load(),
        stt=stt,
        llm=llm_instance,
        tts=tts,
        fnc_ctx=fnc_ctx if enabled_tools else None,
        chat_ctx=llm.ChatContext().append(
            role="system",
            text=config.get("system_prompt", Config.DEFAULT_SYSTEM_PROMPT)
        ),
        # Interruption settings for natural conversation
        allow_interruptions=True,
        interrupt_speech_duration=0.5,  # How long user must speak to interrupt
        interrupt_min_words=2,  # Minimum words to trigger interruption
        min_endpointing_delay=0.5,  # Wait time after user stops speaking
    )

    # Start the agent
    agent.start(ctx.room, participant)

    # Send initial greeting
    greeting = config.get("greeting", Config.DEFAULT_GREETING)
    await agent.say(greeting, allow_interruptions=True)

    # Keep the agent running until the participant disconnects
    # The agent will automatically handle the conversation


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
        )
    )
