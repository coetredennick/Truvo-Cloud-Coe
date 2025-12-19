import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    # LiveKit
    LIVEKIT_URL = os.getenv("LIVEKIT_URL", "")
    LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY", "")
    LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET", "")

    # AI Providers
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
    DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY", "")
    ELEVEN_API_KEY = os.getenv("ELEVEN_API_KEY", "")

    # Dashboard API
    NEXT_API_URL = os.getenv("NEXT_API_URL", "http://localhost:3000")

    # Cal.com
    CAL_API_KEY = os.getenv("CAL_API_KEY", "")
    CAL_EVENT_TYPE_ID = os.getenv("CAL_EVENT_TYPE_ID", "")

    # Default agent settings (used if API fetch fails)
    DEFAULT_SYSTEM_PROMPT = """You are a friendly and professional real estate assistant for Truvo Properties.
Your role is to help potential tenants and buyers with property inquiries.

You can:
- Answer questions about available properties
- Schedule property tours using the book_tour function
- Check availability for tour times
- Provide general information about the leasing process

Be conversational, helpful, and concise. Keep responses brief for voice - typically 1-2 sentences.
If someone wants to book a tour, collect their name, preferred date, and time, then use the booking function."""

    DEFAULT_GREETING = "Hi there! Thanks for calling Truvo Properties. I'm here to help you find your perfect home. Are you looking to schedule a tour or do you have questions about our available properties?"

    # ElevenLabs voice IDs (not names)
    # Rachel: 21m00Tcm4TlvDq8ikWAM, Bella: EXAVITQu4vr4xnSDxMaL
    # Josh: TxGEqnHWrfWFTfGW9XjX, Adam: pNInz6obpgDQGcFmaJgB
    DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"  # Rachel
