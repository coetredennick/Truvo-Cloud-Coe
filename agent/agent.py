import logging
import httpx

from livekit.agents import (
    Agent,
    AgentSession,
    JobContext,
    JobProcess,
    WorkerOptions,
    cli,
    function_tool,
    llm,
)
from livekit.plugins import deepgram, openai, elevenlabs, groq
from livekit.plugins.turn_detector.multilingual import MultilingualModel

from config import Config

logger = logging.getLogger("truvo-agent")
logger.setLevel(logging.INFO)


async def fetch_agent_config(room_name: str) -> dict:
    """Fetch agent configuration from the Next.js dashboard API."""
    try:
        # Room name format: agent-{uuid}-{timestamp}
        # UUID contains hyphens, so we need to extract it properly
        # Example: agent-a719edb0-fae8-44f7-93bb-8b389e09db74-1766296202271
        if room_name.startswith("agent-"):
            # Remove "agent-" prefix, then split off the timestamp (last segment)
            remainder = room_name[6:]  # Remove "agent-"
            # UUID is 36 chars (8-4-4-4-12 format), timestamp is at the end
            parts = remainder.rsplit("-", 1)  # Split from right, only once
            if len(parts) == 2 and len(parts[0]) == 36:  # UUID is 36 chars
                agent_id = parts[0]
            else:
                agent_id = None
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


@function_tool
async def book_demo(name: str, email: str, phone: str = "", preferred_time: str = "") -> str:
    """Book a Truvo product demo. IMPORTANT: Only call this AFTER you have explicitly asked the caller for their name and email and they have provided real values. Never use placeholder or example values like 'john@example.com'. If you don't have their real email, ask for it first.

    Args:
        name: The caller's real full name (must be explicitly provided by caller)
        email: The caller's real email address (must be explicitly provided by caller, never guess)
        phone: Phone number if provided (optional)
        preferred_time: Their stated preferred time (optional)
    """
    from datetime import datetime, timedelta
    import os

    # Try Google Calendar first
    if Config.GOOGLE_SERVICE_ACCOUNT_FILE and Config.GOOGLE_CALENDAR_ID:
        try:
            from google.oauth2 import service_account
            from googleapiclient.discovery import build

            # Get the directory where agent.py is located
            agent_dir = os.path.dirname(os.path.abspath(__file__))
            service_account_path = os.path.join(agent_dir, Config.GOOGLE_SERVICE_ACCOUNT_FILE)

            credentials = service_account.Credentials.from_service_account_file(
                service_account_path,
                scopes=['https://www.googleapis.com/auth/calendar']
            )
            service = build('calendar', 'v3', credentials=credentials)

            # Parse preferred time or default to tomorrow 2pm
            now = datetime.now()
            if preferred_time:
                # Simple parsing - default to tomorrow if we can't parse
                start_time = (now + timedelta(days=1)).replace(hour=14, minute=0, second=0, microsecond=0)
                # Try to extract hour if mentioned
                if "morning" in preferred_time.lower():
                    start_time = start_time.replace(hour=10)
                elif "afternoon" in preferred_time.lower():
                    start_time = start_time.replace(hour=14)
                elif "3" in preferred_time:
                    start_time = start_time.replace(hour=15)
                elif "4" in preferred_time:
                    start_time = start_time.replace(hour=16)
                elif "11" in preferred_time:
                    start_time = start_time.replace(hour=11)
                elif "10" in preferred_time:
                    start_time = start_time.replace(hour=10)
            else:
                start_time = (now + timedelta(days=1)).replace(hour=14, minute=0, second=0, microsecond=0)

            end_time = start_time + timedelta(minutes=30)

            event = {
                'summary': f'Truvo Demo - {name}',
                'description': f'Truvo product demo\n\nName: {name}\nEmail: {email}\nPhone: {phone or "Not provided"}\n\nBooked via Truvo AI receptionist',
                'start': {
                    'dateTime': start_time.isoformat(),
                    'timeZone': 'America/New_York',
                },
                'end': {
                    'dateTime': end_time.isoformat(),
                    'timeZone': 'America/New_York',
                },
                'reminders': {
                    'useDefault': False,
                    'overrides': [
                        {'method': 'popup', 'minutes': 15},
                    ],
                },
            }

            event = service.events().insert(
                calendarId=Config.GOOGLE_CALENDAR_ID,
                body=event,
            ).execute()

            formatted_time = start_time.strftime("%A at %I:%M %p")
            return f"You're all set! I've booked your demo for {formatted_time} and sent a calendar invite to {email}. Looking forward to showing you what Truvo can do!"

        except Exception as e:
            logger.error(f"Google Calendar booking failed: {e}")

    # Fallback - simulate booking
    time_msg = f" for {preferred_time}" if preferred_time else ""
    return f"Perfect! I've got you down for a demo{time_msg}. You'll receive a confirmation at {email} shortly. Looking forward to showing you what Truvo can do for your business!"


class TruvoAgent(Agent):
    """Truvo real estate voice agent."""

    def __init__(self, config: dict) -> None:
        self._config = config

        # Initialize LLM - OpenAI for better conversation quality
        logger.info("Using OpenAI LLM (gpt-4o-mini)")
        self._llm = openai.LLM(
            model="gpt-4o-mini",
            temperature=0.7,  # Balanced for coherent yet natural responses
        )

        # Initialize TTS with natural, expressive settings (optimized for realism)
        self._tts = elevenlabs.TTS(
            voice_id=config.get("voice_id", Config.DEFAULT_VOICE_ID),
            model="eleven_turbo_v2_5",
            voice_settings=elevenlabs.VoiceSettings(
                stability=0.45,          # Balanced for natural speech without robotic variance
                similarity_boost=0.75,   # Higher consistency for realistic voice
                style=0.35,              # More expressive personality
                use_speaker_boost=True,  # Enhanced clarity
            ),
        )

        # Initialize STT with low-latency settings
        self._stt = deepgram.STT(
            model="nova-3",
            language="en",
            detect_language=False,      # Skip language detection for speed
            interim_results=True,       # Stream partial results
            smart_format=True,          # Better formatting
        )

        # Build tools list based on config
        tools = []
        enabled_tools = config.get("tools_enabled", [])
        if "check_availability" in enabled_tools:
            tools.append(check_availability)
        if "book_tour" in enabled_tools:
            tools.append(book_tour)
        if "book_demo" in enabled_tools:
            tools.append(book_demo)

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
    logger.info(f"Greeting: {config.get('greeting')}")
    logger.info(f"System prompt preview: {config.get('system_prompt', '')[:100]}...")

    # Connect to the room
    await ctx.connect()

    # Create the agent
    agent = TruvoAgent(config)

    # Start the agent session with low-latency settings
    session = AgentSession(
        allow_interruptions=True,
        min_endpointing_delay=0.3,          # Faster response (optimized from 0.4)
        max_endpointing_delay=3.5,          # Reduced max wait (optimized from 4.0)
        min_interruption_duration=0.15,     # Faster interruption detection (optimized from 0.25)
        turn_detection=MultilingualModel(), # ML-based turn detection
        preemptive_generation=True,         # Start generating before turn ends
    )

    # Start the session
    await session.start(
        agent=agent,
        room=ctx.room,
    )

    # Send initial greeting
    await session.say(agent.greeting)


def prewarm(proc: JobProcess):
    """Prewarm function - initialize components before accepting jobs for faster cold start."""
    # Prewarm STT
    proc.userdata["deepgram_stt"] = deepgram.STT(
        model="nova-3",
        language="en",
        detect_language=False,
        interim_results=True,
    )
    # Prewarm TTS (establishes connection)
    proc.userdata["elevenlabs_tts"] = elevenlabs.TTS(
        voice_id="iRJijZumQA1KkKmi0Dg6",
        model="eleven_turbo_v2_5",
    )
    # Prewarm LLM
    proc.userdata["llm"] = openai.LLM(model="gpt-4o-mini")


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
        )
    )
