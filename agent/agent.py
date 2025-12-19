import logging
import httpx

from livekit.agents import (
    Agent,
    AgentSession,
    JobContext,
    JobProcess,
    WorkerOptions,
    RoomInputOptions,
    cli,
    function_tool,
    llm,
)
from livekit.plugins import deepgram, openai, elevenlabs

from config import Config

logger = logging.getLogger("truvo-agent")
logger.setLevel(logging.INFO)


async def fetch_agent_config(room_name: str) -> dict:
    """Fetch agent configuration from the Next.js dashboard API."""
    try:
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

    return {
        "system_prompt": Config.DEFAULT_SYSTEM_PROMPT,
        "greeting": Config.DEFAULT_GREETING,
        "voice_id": Config.DEFAULT_VOICE_ID,
        "tools_enabled": ["check_availability", "book_tour"]
    }


# Define tools as module-level functions with @function_tool decorator
@function_tool
async def check_availability(date: str) -> str:
    """Check available tour times for a specific date. Use this before booking to see what times are open.

    Args:
        date: The date to check availability for, in YYYY-MM-DD format
    """
    if not Config.CAL_API_KEY:
        return f"Available times for {date}: 10:00 AM, 11:30 AM, 2:00 PM, 3:30 PM. Which time works best for you?"

    try:
        from datetime import datetime, timedelta
        async with httpx.AsyncClient() as client:
            check_date = datetime.strptime(date, "%Y-%m-%d")
            start_time = check_date.replace(hour=0, minute=0, second=0).isoformat() + "Z"
            end_time = (check_date + timedelta(days=1)).replace(hour=0, minute=0, second=0).isoformat() + "Z"

            response = await client.get(
                "https://api.cal.com/v1/availability",
                params={
                    "apiKey": Config.CAL_API_KEY,
                    "eventTypeId": Config.CAL_EVENT_TYPE_ID,
                    "startTime": start_time,
                    "endTime": end_time,
                },
                timeout=10.0
            )

            if response.status_code == 200:
                data = response.json()
                slots = data.get("slots", {}).get(date, [])
                if not slots:
                    return f"Sorry, there are no available times on {date}. Would you like to check another date?"
                times = [datetime.fromisoformat(s["time"].replace("Z", "+00:00")).strftime("%I:%M %p") for s in slots[:6]]
                times_str = ", ".join(times[:-1]) + f", or {times[-1]}" if len(times) > 1 else times[0]
                return f"Available times on {date}: {times_str}. Which time works for you?"
    except Exception:
        pass
    return "I'm having trouble checking availability right now. Could you try again in a moment?"


@function_tool
async def book_tour(date: str, time: str, name: str, email: str, phone: str = "") -> str:
    """Book a property tour appointment. Use this after confirming the date, time, and getting the visitor's information.

    Args:
        date: Tour date in YYYY-MM-DD format
        time: Tour time in HH:MM format (24-hour)
        name: Full name of the person booking the tour
        email: Email address for confirmation
        phone: Phone number for the booking (optional)
    """
    if not Config.CAL_API_KEY:
        return f"I've booked your tour for {date} at {time}. You'll receive a confirmation email at {email}. We look forward to showing you around!"

    try:
        async with httpx.AsyncClient() as client:
            booking_data = {
                "eventTypeId": int(Config.CAL_EVENT_TYPE_ID),
                "start": f"{date}T{time}:00",
                "responses": {
                    "name": name,
                    "email": email,
                    "phone": phone or "",
                    "notes": "Booked via Truvo AI Assistant"
                },
                "timeZone": "America/New_York",
                "language": "en",
                "metadata": {"source": "truvo-voice-agent"}
            }

            response = await client.post(
                "https://api.cal.com/v1/bookings",
                params={"apiKey": Config.CAL_API_KEY},
                json=booking_data,
                timeout=15.0
            )

            if response.status_code in [200, 201]:
                return f"Excellent! I've booked your property tour for {date} at {time}. A confirmation email has been sent to {email}. Is there anything else I can help you with?"
    except Exception:
        pass
    return "I'm having trouble completing the booking right now. Would you like me to try again?"


class TruvoAgent(Agent):
    """Truvo real estate voice agent."""

    def __init__(self, config: dict) -> None:
        self._config = config

        # Initialize LLM
        self._llm = openai.LLM(
            model="gpt-4o-mini",
            temperature=0.7,
        )

        # Initialize TTS with configured voice
        self._tts = elevenlabs.TTS(
            voice_id=config.get("voice_id", Config.DEFAULT_VOICE_ID),
            model="eleven_turbo_v2_5",
        )

        # Initialize STT
        self._stt = deepgram.STT(model="nova-2")

        # Build tools list based on config
        tools = []
        enabled_tools = config.get("tools_enabled", [])
        if "check_availability" in enabled_tools:
            tools.append(check_availability)
        if "book_tour" in enabled_tools:
            tools.append(book_tour)

        super().__init__(
            instructions=config.get("system_prompt", Config.DEFAULT_SYSTEM_PROMPT),
            llm=self._llm,
            tts=self._tts,
            stt=self._stt,
            tools=tools,
        )

    @property
    def greeting(self) -> str:
        return self._config.get("greeting", Config.DEFAULT_GREETING)


async def entrypoint(ctx: JobContext):
    """Main entrypoint for the voice agent."""
    logger.info(f"Agent joining room: {ctx.room.name}")

    # Fetch agent configuration from dashboard API
    config = await fetch_agent_config(ctx.room.name)
    logger.info(f"Loaded config - Voice: {config.get('voice_id')}, Tools: {config.get('tools_enabled')}")

    # Connect to the room
    await ctx.connect()

    # Create the agent
    agent = TruvoAgent(config)

    # Start the agent session
    session = AgentSession(
        allow_interruptions=True,
        min_endpointing_delay=0.5,
    )

    # Start the session
    await session.start(
        agent=agent,
        room=ctx.room,
        room_input_options=RoomInputOptions(),
    )

    # Send initial greeting
    await session.say(agent.greeting)


def prewarm(proc: JobProcess):
    """Prewarm function - called before accepting jobs."""
    proc.userdata["deepgram_stt"] = deepgram.STT(model="nova-2")


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
        )
    )
