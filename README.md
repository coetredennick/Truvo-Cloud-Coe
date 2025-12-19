# Truvo Cloud

A self-hosted AI voice agent platform for real estate, built on LiveKit. Replaces Vapi with full control over your voice infrastructure at a fraction of the cost.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Truvo Cloud                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │   Browser    │     │   LiveKit    │     │    Python    │    │
│  │  Playground  │────▶│    Cloud     │◀────│    Agent     │    │
│  └──────────────┘     └──────────────┘     └──────────────┘    │
│         │                    │                    │             │
│         │                    │                    │             │
│         ▼                    ▼                    ▼             │
│  ┌──────────────────────────────────────────────────────┐      │
│  │              Next.js Dashboard + API                  │      │
│  └──────────────────────────────────────────────────────┘      │
│                           │                                     │
│                           ▼                                     │
│                    ┌──────────────┐                             │
│                    │   Supabase   │                             │
│                    │  PostgreSQL  │                             │
│                    └──────────────┘                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Tech Stack

- **Voice Runtime:** Python + LiveKit Agents SDK
- **LLM:** OpenAI GPT-4o-mini
- **STT:** Deepgram Nova-2
- **TTS:** ElevenLabs Turbo v2.5
- **Database:** Supabase (PostgreSQL)
- **Dashboard:** Next.js 14 + Tailwind + shadcn/ui
- **Booking:** Cal.com Integration

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- LiveKit Cloud account (free tier available)
- Supabase account (free tier available)
- API keys: OpenAI, Deepgram, ElevenLabs

### 1. Set Up Supabase

1. Create a new Supabase project at https://supabase.com
2. Go to SQL Editor and run the contents of `dashboard/supabase-schema.sql`
3. Copy your project URL and keys from Settings > API

### 2. Set Up LiveKit

1. Create a LiveKit Cloud account at https://cloud.livekit.io
2. Create a new project
3. Copy your API Key and Secret from Settings

### 3. Configure the Dashboard

```bash
cd dashboard
cp .env.local.example .env.local
```

Edit `.env.local` with your credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

LIVEKIT_URL=wss://your-app.livekit.cloud
LIVEKIT_API_KEY=API...
LIVEKIT_API_SECRET=...
```

Install dependencies and run:

```bash
npm install
npm run dev
```

Dashboard will be at http://localhost:3000

### 4. Configure the Python Agent

```bash
cd agent
cp .env.example .env
```

Edit `.env` with your credentials:

```env
LIVEKIT_URL=wss://your-app.livekit.cloud
LIVEKIT_API_KEY=API...
LIVEKIT_API_SECRET=...

OPENAI_API_KEY=sk-...
DEEPGRAM_API_KEY=...
ELEVEN_API_KEY=...

NEXT_API_URL=http://localhost:3000
```

Install dependencies (using uv for speed):

```bash
# Install uv if you don't have it
curl -LsSf https://astral.sh/uv/install.sh | sh

# Create venv and install
uv venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
uv pip install -r requirements.txt
```

Or with pip:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 5. Run the Agent

```bash
cd agent
python agent.py dev
```

The agent will connect to LiveKit and wait for rooms to join.

### 6. Test It Out

1. Open http://localhost:3000/dashboard
2. Create or edit an agent with your desired prompt
3. Go to Playground
4. Click "Start Conversation" and allow microphone access
5. Talk to your agent!

## Project Structure

```
├── agent/                    # Python Voice Agent
│   ├── agent.py              # Main agent entry point
│   ├── config.py             # Environment configuration
│   ├── tools/
│   │   ├── __init__.py
│   │   └── booking.py        # Cal.com booking functions
│   ├── requirements.txt
│   └── .env.example
│
├── dashboard/                # Next.js Dashboard
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/          # API routes
│   │   │   │   ├── agents/   # Agent CRUD
│   │   │   │   ├── calls/    # Call logs
│   │   │   │   ├── livekit/  # Token generation
│   │   │   │   └── webhooks/ # LiveKit events
│   │   │   └── dashboard/    # Dashboard pages
│   │   ├── components/       # UI components
│   │   ├── lib/              # Utilities
│   │   └── types/            # TypeScript types
│   ├── supabase-schema.sql   # Database schema
│   └── .env.local.example
│
└── README.md
```

## Adding Cal.com Booking

1. Create a Cal.com account and get your API key
2. Create an event type for property tours
3. Add to your agent `.env`:

```env
CAL_API_KEY=cal_live_...
CAL_EVENT_TYPE_ID=123456
```

The agent will now be able to check availability and book tours during conversations.

## Deployment

### Python Agent (Fly.io)

```bash
cd agent
flyctl launch
flyctl secrets set LIVEKIT_URL=... OPENAI_API_KEY=... # etc
flyctl deploy
```

### Dashboard (Vercel)

```bash
cd dashboard
vercel
```

Set environment variables in the Vercel dashboard.

## Cost Comparison

| Component | Your Cost | Vapi Cost |
|-----------|-----------|-----------|
| LiveKit | $0.01/min | Included in $0.05/min |
| Deepgram | $0.0043/min | Included |
| OpenAI | ~$0.001/min | Included |
| ElevenLabs | ~$0.003/min | Included |
| **Total** | **~$0.02/min** | **$0.05/min** |

**Savings: 60% lower cost** + full control over your data and infrastructure.

## Next Steps

- [ ] Add SIP trunk for real phone numbers (Telnyx/Twilio)
- [ ] Implement call recording storage
- [ ] Add multi-tenant support with organization isolation
- [ ] Build analytics dashboard
- [ ] Add webhook notifications for bookings
