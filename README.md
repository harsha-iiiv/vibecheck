# VibeCheck 🏖️🤖

> Multi-agent AI event atmosphere engine — BeachHacks 9.0

VibeCheck uses 5 autonomous AI agents to sense, react to, and shape the vibe of social gatherings in real time — controlling music, visuals, and voice.

## Demo

Live crowd reactions → AI agents negotiate the vibe → music and visuals shift automatically.

## Tech Stack

| Layer | Tech |
|-------|------|
| Agents | fetch.ai uAgents (5 autonomous agents) |
| AI | Google Gemini 2.0 Flash + Mistral Medium fallback |
| Voice | ElevenLabs TTS |
| Music | ElevenLabs Sound Generation + YouTube Music |
| Database | MongoDB Atlas |
| Frontend | Next.js 16, Tailwind CSS, Framer Motion |
| Blockchain | Solana (Memo Program — devnet NFT minting) |

## Architecture

```
CrowdAgent  ──► MoodAgent ──► DJAgent     (music selection)
                    │
                    ├──► VisualAgent  (canvas animations)
                    └──► SocialAgent  (icebreakers & prompts)
```

- **MoodAgent** — reads energy/mood, orchestrates all other agents
- **CrowdAgent** — processes mic energy + emoji reactions from the crowd
- **DJAgent** — selects tracks with genre opinions (and occasional artistic pushback)
- **VisualAgent** — drives the generative canvas based on vibe state
- **SocialAgent** — generates crowd prompts and icebreakers

All agents communicate via fetch.ai's uAgents protocol. A FastAPI WebSocket bridge streams events to the frontend in real time.

## Features

- 🎵 AI-generated beats via ElevenLabs Sound Generation
- 🔴 Live mic energy detection (Web Audio API)
- 🎉 Crowd emoji reactions that nudge the vibe instantly
- 🎨 Generative canvas visuals that respond to mood
- 🗣️ Agent voice lines via ElevenLabs TTS
- ◎ Mint the current AI beat as a Solana NFT (devnet)
- 📊 MongoDB Atlas vibe history logging

## Setup

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in your API keys
python run.py
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_URL
npm run dev
```

### Environment Variables

**Backend** (`backend/.env`):
```
GOOGLE_API_KEY=...
ELEVENLABS_API_KEY=...
MISTRAL_API_KEY=...
MONGODB_URI=...
```

**Frontend** (`frontend/.env.local`):
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
```

## Built at BeachHacks 9.0
