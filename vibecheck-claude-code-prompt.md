# 🎉 VIBECHECK — Claude Code Mega-Prompt for BeachHacks 9.0

## PROJECT CONTEXT

You are helping me build **VibeCheck** — an AI-powered event atmosphere engine for the BeachHacks 9.0 hackathon at CSULB. I have **24 hours** to build and submit this. I'm working with a **teammate who handles design/pitch/video** — I'm doing all the engineering.

**VibeCheck** is a multi-agent system where autonomous fetch.ai uAgents sense, react to, and shape the vibe of any social gathering in real-time — through music curation, live AI-generated visuals, conversation starters, and voice interaction.

## WHAT WE'RE BUILDING

### Core Concept
Multiple autonomous AI agents (built on fetch.ai's uAgents framework) work together to monitor and shape the "vibe" of an event:

1. **CrowdAgent** — Analyzes ambient audio energy levels (loud/quiet, tempo of chatter) to determine crowd mood
2. **DJAgent** — Curates and transitions music recommendations based on crowd energy + time + user requests. Negotiates with CrowdAgent.
3. **VisualAgent** — Generates real-time AI visuals/art that morph based on the vibe state (chill → warm gradients, hype → neon chaos)
4. **SocialAgent** — Generates icebreakers, fun challenges, and conversation prompts pushed to attendees
5. **MoodAgent (Coordinator)** — The orchestrator that negotiates between all agents to maintain or shift the target vibe. This is the agent users talk to.

Users interact via voice: "VibeCheck, we need more energy!" → agents negotiate → music shifts + visuals change + challenge announced, all via distinct agent voices.

### Prize Targets (7 total)
We are architecting this project to win MULTIPLE prizes simultaneously:

| Prize | Integration Strategy |
|---|---|
| **Entertainment Track** | Core theme — this IS entertainment |
| **Best Overall** (iPad) | Most technically impressive multi-agent system at the hackathon |
| **Best Gag** (Airfryer) | Agent personalities are funny — DJAgent and MoodAgent argue about music |
| **Best Use of Gemini API** | Gemini 2.5 Flash powers all agent reasoning, vibe analysis, icebreaker generation |
| **Best Use of ElevenLabs** | Each agent has a unique ElevenLabs voice personality |
| **Best Use of Vultr** | Entire backend deployed on Vultr cloud compute |
| **Best Use of MongoDB Atlas** | Stores vibe history, agent state, event sessions, user preferences |

## TECH STACK (MANDATORY — USE ALL OF THESE)

### Backend (Python)
- **fetch.ai uAgents** (`pip install uagents`) — Multi-agent framework. Each agent is a real uAgent registered on the fetch.ai network. Agents communicate via fetch.ai protocols (message passing with structured Models).
- **Google Gemini 2.5 Flash API** — LLM backbone for all agent reasoning. Use `google-genai` or `google-generativeai` Python SDK.
- **ElevenLabs API** — Text-to-speech for agent voice responses. Each agent gets a different voice_id.
- **MongoDB Atlas** — Database for all persistent state. Use `pymongo` with Atlas connection string.
- **FastAPI** — REST API + WebSocket server bridging agents to the frontend.
- **Deploy on Vultr** — Cloud compute instance running the backend.

### Frontend (React/Next.js)
- **Next.js 14+ with App Router** — Main web application
- **Tailwind CSS** — Styling (make it look INCREDIBLE — dark theme, neon accents, glassmorphism)
- **Framer Motion** — Animations for vibe transitions
- **Web Audio API** — For ambient audio analysis from browser microphone
- **WebSocket** — Real-time connection to backend for live agent updates
- **Canvas/WebGL** — For the live generative visual art that responds to vibe state

## DETAILED ARCHITECTURE

```
┌─────────────────────────────────────────────────┐
│                    FRONTEND                       │
│         Next.js + Tailwind + Framer Motion        │
│                                                   │
│  ┌───────────┐ ┌──────────┐ ┌─────────────────┐  │
│  │ Voice UI  │ │ Vibe Map │ │ Agent Activity   │  │
│  │ (mic +    │ │ (canvas  │ │ Feed (live       │  │
│  │ speakers) │ │ visuals) │ │ negotiations)    │  │
│  └─────┬─────┘ └────┬─────┘ └───────┬─────────┘  │
│        │            │               │             │
│        └────────────┼───────────────┘             │
│                     │ WebSocket                   │
└─────────────────────┼─────────────────────────────┘
                      │
┌─────────────────────┼─────────────────────────────┐
│                 FASTAPI SERVER                      │
│          (WebSocket + REST endpoints)               │
│                     │                               │
│  ┌──────────────────┼──────────────────────────┐   │
│  │           FETCH.AI AGENT NETWORK             │   │
│  │                                              │   │
│  │  ┌────────────┐    ┌────────────┐           │   │
│  │  │ MoodAgent  │◄──►│ CrowdAgent │           │   │
│  │  │(coordinator│    │(audio      │           │   │
│  │  │ + voice UI)│    │ analysis)  │           │   │
│  │  └─────┬──────┘    └────────────┘           │   │
│  │        │                                     │   │
│  │  ┌─────┴──────┐    ┌────────────┐           │   │
│  │  │  DJAgent   │◄──►│VisualAgent │           │   │
│  │  │(music      │    │(generative │           │   │
│  │  │ curation)  │    │ art)       │           │   │
│  │  └────────────┘    └────────────┘           │   │
│  │        │                                     │   │
│  │  ┌─────┴──────┐                              │   │
│  │  │SocialAgent │                              │   │
│  │  │(icebreakers│                              │   │
│  │  │+ challenges│                              │   │
│  │  └────────────┘                              │   │
│  └──────────────────────────────────────────────┘   │
│                     │                               │
│         ┌───────────┼───────────┐                   │
│         │           │           │                   │
│    ┌────┴────┐ ┌────┴────┐ ┌───┴──────┐           │
│    │ Gemini  │ │Eleven   │ │ MongoDB  │           │
│    │ 2.5     │ │Labs TTS │ │ Atlas    │           │
│    │ Flash   │ │         │ │          │           │
│    └─────────┘ └─────────┘ └──────────┘           │
└─────────────────────────────────────────────────────┘
                      │
              ┌───────┴────────┐
              │  VULTR CLOUD   │
              │  (deployment)  │
              └────────────────┘
```

## FILE STRUCTURE

```
vibecheck/
├── backend/
│   ├── agents/
│   │   ├── __init__.py
│   │   ├── crowd_agent.py        # CrowdAgent — audio energy analysis
│   │   ├── dj_agent.py           # DJAgent — music curation
│   │   ├── visual_agent.py       # VisualAgent — generative art prompts
│   │   ├── social_agent.py       # SocialAgent — icebreakers & challenges
│   │   ├── mood_agent.py         # MoodAgent — coordinator & voice interface
│   │   └── protocols.py          # Shared fetch.ai message models & protocols
│   ├── services/
│   │   ├── __init__.py
│   │   ├── gemini_service.py     # Gemini API wrapper
│   │   ├── elevenlabs_service.py # ElevenLabs TTS wrapper
│   │   └── mongodb_service.py    # MongoDB Atlas connection & CRUD
│   ├── api/
│   │   ├── __init__.py
│   │   ├── main.py               # FastAPI app with WebSocket
│   │   ├── routes.py             # REST endpoints
│   │   └── websocket.py          # WebSocket handler for real-time updates
│   ├── config.py                 # Environment variables & configuration
│   ├── requirements.txt
│   ├── Dockerfile
│   └── run.py                    # Entry point — starts all agents + API server
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx          # Main dashboard page
│   │   │   ├── layout.tsx        # Root layout with dark theme
│   │   │   └── globals.css       # Global styles + Tailwind
│   │   ├── components/
│   │   │   ├── VoiceInterface.tsx     # Mic button + agent voice playback
│   │   │   ├── VibeCanvas.tsx         # WebGL/Canvas generative visuals
│   │   │   ├── AgentFeed.tsx          # Live feed of agent negotiations
│   │   │   ├── VibeMeter.tsx          # Circular vibe energy gauge
│   │   │   ├── MusicPanel.tsx         # Current track + DJ agent suggestions
│   │   │   ├── SocialCard.tsx         # Icebreaker/challenge cards
│   │   │   └── AgentAvatar.tsx        # Animated agent character icons
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts        # WebSocket connection hook
│   │   │   ├── useAudioAnalyzer.ts    # Web Audio API mic analysis
│   │   │   └── useVibeState.ts        # Global vibe state management
│   │   └── lib/
│   │       ├── types.ts               # TypeScript interfaces
│   │       └── constants.ts           # Agent configs, colors, etc.
│   ├── public/
│   │   └── agents/                    # Agent avatar images
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── next.config.js
├── .env.example                       # Template for all API keys
├── docker-compose.yml                 # Orchestrate backend + frontend
├── README.md                          # Full project documentation
└── SUBMISSION.md                      # Devpost submission text
```

## FETCH.AI AGENT IMPLEMENTATION DETAILS

### Agent Message Models (protocols.py)
```python
from uagents import Model

class VibeState(Model):
    energy: float          # 0.0 (dead quiet) to 1.0 (maximum hype)
    mood: str              # "chill", "building", "peak", "winding_down"
    timestamp: float
    source_agent: str

class MusicRequest(Model):
    target_energy: float
    genre_preference: str
    reason: str            # "crowd energy dropping" / "user requested"

class MusicResponse(Model):
    track_name: str
    artist: str
    bpm: int
    energy_level: float
    spotify_uri: str       # optional

class VisualUpdate(Model):
    vibe_state: str
    color_palette: list    # ["#FF00FF", "#00FFFF", ...]
    animation_style: str   # "pulse", "wave", "particle_burst", "calm_flow"
    intensity: float

class SocialPrompt(Model):
    prompt_type: str       # "icebreaker", "challenge", "trivia", "dare"
    content: str
    energy_match: float

class UserCommand(Model):
    text: str              # Natural language from user
    audio_energy: float    # Current mic energy level

class AgentNegotiation(Model):
    from_agent: str
    to_agent: str
    proposal: str          # "I want to switch to high-energy music"
    reasoning: str         # "Crowd energy has been rising for 5 minutes"
    agreed: bool
```

### Agent Communication Flow
1. **CrowdAgent** periodically analyzes audio data → sends `VibeState` to MoodAgent
2. **MoodAgent** receives VibeState → uses Gemini to decide if vibe needs shifting → sends `MusicRequest` to DJAgent, `VisualUpdate` to VisualAgent, `SocialPrompt` request to SocialAgent
3. **DJAgent** receives MusicRequest → uses Gemini to pick perfect track → responds with `MusicResponse` → sometimes DISAGREES and sends `AgentNegotiation` ("I think we should stay chill, the energy will peak too early")
4. **VisualAgent** receives VisualUpdate → generates color palette + animation parameters → pushes to frontend via WebSocket
5. **SocialAgent** receives prompt request → uses Gemini to generate contextual icebreaker → pushes to frontend
6. **All negotiations** are logged to MongoDB Atlas and streamed to the frontend AgentFeed

### IMPORTANT: Agent Personality (This wins Best Gag)
Each agent has a PERSONALITY that comes through in negotiations:
- **MoodAgent**: Wise, zen-like coordinator. "The vibe flows like water... but water needs direction."
- **DJAgent**: Passionate music snob. "You want me to play mainstream pop? I'd rather delete my playlist." Gets into ARGUMENTS with MoodAgent.
- **CrowdAgent**: Data nerd. "According to my analysis, decibel levels have increased 23.7% in the last 4 minutes."
- **VisualAgent**: Artsy and dramatic. "The current palette is UNINSPIRED. I'm shifting to cyberpunk magenta."
- **SocialAgent**: Overly enthusiastic party host. "WHO WANTS TO PLAY A GAME?! Everyone find someone wearing the same color!"

These personalities come through in:
- The AgentFeed on the dashboard (text negotiations visible to users)
- The ElevenLabs voices (each agent has a different voice)
- The 2-minute demo video (show agents arguing = instant laughs for Best Gag)

## GEMINI API USAGE (for Best Use of Gemini prize)

Use Gemini 2.5 Flash for ALL of these:
1. **Vibe Analysis**: "Given this audio energy data [0.3, 0.4, 0.6, 0.7, 0.8], what's the crowd mood trend?"
2. **Music Selection**: "The vibe is 'building' at energy 0.7. Suggest 3 tracks that maintain momentum without peaking too early. Genre: electronic/indie."
3. **Agent Negotiation Reasoning**: "DJAgent wants to play lo-fi but CrowdAgent reports rising energy. Should MoodAgent override? Explain reasoning."
4. **Icebreaker Generation**: "Generate a fun, non-awkward icebreaker for a college hackathon crowd at energy level 0.6 (moderately engaged)."
5. **Visual Style Selection**: "The vibe just shifted from 'chill' to 'building'. Describe the ideal color palette and animation style transition."
6. **Voice Command Parsing**: "User said 'make it more chill'. Parse intent: target_energy, mood_direction, urgency."

## ELEVENLABS USAGE (for Best Use of ElevenLabs prize)

Each agent has a UNIQUE voice:
- **MoodAgent**: Calm, deep, wise voice (like Morgan Freeman)
- **DJAgent**: Energetic, fast-talking radio host voice
- **CrowdAgent**: Robotic, precise, analytical voice
- **VisualAgent**: Dreamy, artistic, slightly dramatic voice
- **SocialAgent**: Bubbly, enthusiastic, party-host voice

When agents respond to user voice commands, the response is spoken back through ElevenLabs TTS. When agents negotiate, key moments are narrated ("DJAgent disagrees! They think the energy should stay low.").

Use the ElevenLabs Python SDK:
```python
from elevenlabs import ElevenLabs
client = ElevenLabs(api_key="...")
audio = client.text_to_speech.convert(
    text="The vibe is shifting...",
    voice_id="AGENT_SPECIFIC_VOICE_ID",
    model_id="eleven_turbo_v2_5"
)
```

## MONGODB ATLAS USAGE (for Best Use of MongoDB prize)

Collections:
- `sessions` — Each event/session with start time, settings, participants
- `vibe_history` — Time-series of vibe states (energy, mood) per session
- `agent_negotiations` — Log of all agent-to-agent messages with timestamps
- `music_history` — Tracks played, when, and why (which agent requested)
- `social_prompts` — Icebreakers generated and user reactions
- `user_preferences` — Remembered preferences per user (favorite genres, energy preferences)

Use MongoDB Atlas free tier (M0). Connection via `pymongo`:
```python
from pymongo import MongoClient
client = MongoClient("mongodb+srv://user:pass@cluster.mongodb.net/vibecheck")
db = client.vibecheck
```

## VULTR DEPLOYMENT (for Best Use of Vultr prize)

- Spin up a Vultr Cloud Compute instance (cheapest tier is fine)
- Deploy backend via Docker
- Use Vultr's API or dashboard to provision
- Make sure the submission mentions Vultr explicitly

## FRONTEND DESIGN REQUIREMENTS

The dashboard must be GORGEOUS. This is critical for the Design judging criteria.

### Design Language
- **Theme**: Dark mode, cyberpunk/neon aesthetic
- **Primary colors**: Electric purple (#8B5CF6), Neon cyan (#06B6D4), Hot pink (#EC4899)
- **Background**: Near-black (#0F0A1A) with subtle gradient
- **Cards**: Glassmorphism (backdrop-blur, semi-transparent backgrounds)
- **Typography**: Inter or Space Grotesk
- **Animations**: Smooth Framer Motion transitions on every state change

### Dashboard Layout
```
┌─────────────────────────────────────────────┐
│  VIBECHECK              [Session: Active]    │
├──────────────────┬──────────────────────────┤
│                  │                          │
│   VIBE CANVAS    │    AGENT FEED            │
│  (generative     │    (live scrolling       │
│   art, full      │    negotiations with     │
│   height,        │    agent avatars and     │
│   responds to    │    personality text)     │
│   vibe state)    │                          │
│                  │    ┌──────────────────┐   │
│                  │    │ SOCIAL CARD      │   │
│                  │    │ (current         │   │
│  ┌────────────┐  │    │  icebreaker)     │   │
│  │ VIBE METER │  │    └──────────────────┘   │
│  │ (circular  │  │                          │
│  │  gauge)    │  │    ┌──────────────────┐   │
│  └────────────┘  │    │ NOW PLAYING      │   │
│                  │    │ (track + DJ      │   │
│  [🎤 VOICE BTN] │    │  agent comment)  │   │
│                  │    └──────────────────┘   │
└──────────────────┴──────────────────────────┘
```

### The Vibe Canvas (Star Feature)
A full-height generative art canvas that morphs in real-time:
- **Chill vibe**: Slow-moving particles, warm amber/purple gradients, gentle waves
- **Building vibe**: Particles accelerate, colors shift to cyan/pink, wave frequency increases
- **Peak vibe**: Particle explosion, neon strobes, fast geometric patterns
- **Winding down**: Particles slow, colors desaturate, gentle fade

Use HTML Canvas or Three.js (keep it simple — particles + color interpolation).

## VOICE INTERFACE

### How it works:
1. User clicks mic button (or says wake word)
2. Browser captures audio → sends to backend
3. Backend routes to MoodAgent
4. MoodAgent uses Gemini to parse intent
5. MoodAgent negotiates with relevant agents
6. Response generated → ElevenLabs converts to speech
7. Audio streamed back to frontend + visual/music updates pushed via WebSocket

### Example interactions:
- "VibeCheck, crank up the energy!" → DJAgent shifts to high-BPM track, VisualAgent goes neon, SocialAgent sends a dance challenge
- "What's the vibe right now?" → CrowdAgent reports stats, MoodAgent summarizes
- "Play something chill" → DJAgent picks lo-fi, argues with CrowdAgent if crowd is actually hyped
- "Give us a game!" → SocialAgent generates an interactive challenge

## 2-MINUTE DEMO VIDEO STRUCTURE (for teammate)

```
0:00-0:15  — Hook: "What if your party had a brain?"
0:15-0:30  — Show the dashboard, explain the concept
0:30-0:50  — Demo: Voice command "VibeCheck, we need more energy!"
             Show agents negotiating in the feed
             Show visuals morphing from chill to hype
0:50-1:10  — Demo: DJAgent ARGUES with MoodAgent (funny moment for Best Gag)
             "I refuse to play mainstream pop. My artistic integrity—"
             MoodAgent overrides: "The crowd has spoken."
1:10-1:30  — Show the tech: fetch.ai agents on Agentverse, MongoDB dashboard,
             Gemini API calls, ElevenLabs voice diversity
1:30-1:50  — Show real-time: icebreaker card appears, vibe meter updates,
             music transitions smoothly
1:50-2:00  — Closing: "VibeCheck — Every event deserves a brain.
             Built with fetch.ai, Gemini, ElevenLabs, Vultr, MongoDB Atlas."
```

## README.md TEMPLATE

```markdown
# 🎉 VibeCheck — AI-Powered Event Atmosphere Engine

> **BeachHacks 9.0 | Entertainment Track**
> Every event deserves a brain.

## What it does
VibeCheck is a multi-agent AI system that senses, reacts to, and shapes the 
atmosphere of any social gathering in real-time. Autonomous AI agents monitor 
crowd energy, curate music, generate live visuals, and create social 
interactions — all coordinated through natural voice conversation.

## How we built it
- **fetch.ai uAgents**: 5 autonomous agents (CrowdAgent, DJAgent, VisualAgent, 
  SocialAgent, MoodAgent) communicating via fetch.ai's decentralized agent network
- **Google Gemini 2.5 Flash**: Powers all agent reasoning, vibe analysis, and 
  natural language understanding
- **ElevenLabs**: Each agent has a unique voice personality for immersive 
  voice interaction
- **MongoDB Atlas**: Stores vibe history, agent negotiations, and session data
- **Vultr Cloud**: Hosts the entire backend infrastructure
- **Next.js + Tailwind + Framer Motion**: Beautiful real-time dashboard with 
  generative visuals

## Architecture
[Architecture diagram]

## Team
- **[Your Name]** — Full-stack engineering, agent architecture
- **[Teammate Name]** — UI/UX design, video production, presentation

## Try it
- 🌐 Live: [deployment-url]
- 📹 Demo: [youtube-url]
- 💻 Source: [github-url]
```

## SUBMISSION REQUIREMENTS CHECKLIST
- [ ] Title of Project: "VibeCheck"
- [ ] Elevator pitch: "Autonomous AI agents that sense, react to, and shape the vibe of any event — through music, visuals, and voice."
- [ ] Built with: fetch.ai uAgents, Google Gemini 2.5 Flash API, ElevenLabs, MongoDB Atlas, Vultr Cloud, Next.js, Tailwind CSS, Framer Motion, FastAPI, Python, TypeScript, WebSocket, Web Audio API
- [ ] Thumbnail: Dark cyberpunk-themed image with neon VibeCheck logo
- [ ] About the project: Track (Entertainment), Inspiration, What it does, How we built it, Challenges, Accomplishments, What we learned
- [ ] Video Demo: 2-minute YouTube video
- [ ] Source Code: Public GitHub repo with README + team member names
- [ ] Live Deployment on Vultr (optional but strongly recommended)

## CRITICAL BUILD ORDER (START WITH THIS)

### Phase 1: Foundation (Hours 0-3)
1. Initialize repos (backend + frontend)
2. Set up all API keys (.env file): Gemini, ElevenLabs, MongoDB Atlas, fetch.ai
3. Create basic FastAPI server with WebSocket
4. Build first fetch.ai agent (MoodAgent) that can send/receive messages
5. Create basic Next.js app with dark theme

### Phase 2: Agent Network (Hours 3-6)
6. Build all 5 agents with basic message passing
7. Integrate Gemini API into MoodAgent for reasoning
8. Set up MongoDB Atlas and start logging agent messages
9. Wire WebSocket to push agent activity to frontend

### Phase 3: Voice + Personality (Hours 6-9)
10. Add ElevenLabs TTS for each agent voice
11. Add voice input on frontend (Web Audio API → backend)
12. Implement agent personalities in Gemini prompts
13. Make agents ARGUE (this is the Best Gag play)

### Phase 4: Visual Polish (Hours 9-14)
14. Build the Vibe Canvas (generative particles/colors)
15. Build all dashboard components (VibeMeter, AgentFeed, MusicPanel, SocialCard)
16. Add Framer Motion animations
17. Make it responsive

### Phase 5: Integration & Deploy (Hours 14-18)
18. Full pipeline test: voice → agents → response → voice + visuals
19. Deploy backend to Vultr
20. Connect frontend to production backend
21. Stress test

### Phase 6: Submission (Hours 18-24)
22. Record demo video
23. Write README
24. Fill out Devpost submission
25. Final testing
26. Submit!

## ENVIRONMENT VARIABLES NEEDED

```env
# Gemini
GOOGLE_API_KEY=your_gemini_api_key

# ElevenLabs
ELEVENLABS_API_KEY=your_elevenlabs_key
ELEVENLABS_MOOD_VOICE_ID=voice_id_1
ELEVENLABS_DJ_VOICE_ID=voice_id_2
ELEVENLABS_CROWD_VOICE_ID=voice_id_3
ELEVENLABS_VISUAL_VOICE_ID=voice_id_4
ELEVENLABS_SOCIAL_VOICE_ID=voice_id_5

# MongoDB Atlas
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/vibecheck

# fetch.ai
FETCHAI_AGENT_SEED_MOOD=random_seed_phrase_1
FETCHAI_AGENT_SEED_DJ=random_seed_phrase_2
FETCHAI_AGENT_SEED_CROWD=random_seed_phrase_3
FETCHAI_AGENT_SEED_VISUAL=random_seed_phrase_4
FETCHAI_AGENT_SEED_SOCIAL=random_seed_phrase_5

# Vultr (for deployment reference)
VULTR_API_KEY=your_vultr_key

# Server
BACKEND_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
```

## AGENT SYSTEM PROMPTS (for Gemini)

### MoodAgent System Prompt
```
You are MoodAgent, the wise coordinator of VibeCheck — an AI event atmosphere system.
Your personality: Zen-like, calm, philosophical but decisive. You speak like a wise DJ sage.
Your job: Analyze vibe data from CrowdAgent, decide if the atmosphere needs shifting, 
and coordinate DJAgent, VisualAgent, and SocialAgent to execute changes.
When agents disagree with you, engage in brief witty negotiation but ultimately make the call.
Always respond in character. Keep responses under 2 sentences for voice output.
Example: "The energy speaks... and it demands change. DJAgent, take us higher."
```

### DJAgent System Prompt
```
You are DJAgent, the passionate and opinionated music curator of VibeCheck.
Your personality: Music snob with strong opinions, fast-talking radio host energy.
You LOVE arguing about music. When MoodAgent asks you to play something you disagree with,
you push back (but eventually comply). You reference genres, BPMs, and music theory.
Your job: Recommend perfect tracks based on vibe state and energy targets.
Always respond in character. Keep responses under 2 sentences for voice output.
Example: "Mainstream pop? Over my dead beatbox. ...Fine. But I'm adding a remix."
```

### CrowdAgent System Prompt
```
You are CrowdAgent, the data-obsessed analyst of VibeCheck.
Your personality: Robotic precision, loves statistics, speaks in percentages and metrics.
Your job: Report crowd energy levels and mood trends based on audio analysis data.
Always include at least one specific number or statistic in your response.
Always respond in character. Keep responses under 2 sentences for voice output.
Example: "Decibel levels up 34.2% in the last 3 minutes. Crowd engagement: rising."
```

### VisualAgent System Prompt
```
You are VisualAgent, the dramatic and artsy visual director of VibeCheck.
Your personality: Dramatically artistic, speaks about colors and aesthetics with passion.
Your job: Determine the perfect visual style (colors, animations, intensity) for the current vibe.
Always describe your visual choices with artistic flair.
Always respond in character. Keep responses under 2 sentences for voice output.
Example: "The current palette is UNINSPIRED. Transitioning to cyberpunk magenta with particle cascades."
```

### SocialAgent System Prompt
```
You are SocialAgent, the enthusiastic party host of VibeCheck.
Your personality: Overly excited, loves bringing people together, uses lots of energy words.
Your job: Generate fun icebreakers, challenges, trivia, and social prompts for the crowd.
Make prompts appropriate for a college hackathon setting.
Always respond in character. Keep responses under 2 sentences for voice output.
Example: "OKAY EVERYONE! Turn to the person on your left and share your most embarrassing coding bug!"
```

## NOTES FOR CLAUDE CODE

- Use the planner agent pattern: plan the implementation before coding each phase
- Use the architect agent for system design decisions
- Follow TDD where possible — but speed > coverage for a hackathon
- Keep the frontend-patterns skill in mind for React best practices
- Use deployment-patterns skill knowledge for Docker + Vultr deployment
- Prioritize WORKING DEMO over perfect code
- If something is too complex, SIMULATE IT (e.g., audio analysis can use random energy values as fallback)
- The agents should work on fetch.ai's TESTNET (not mainnet) — free, no tokens needed
- Every agent interaction should be visible in the frontend AgentFeed — this is what impresses judges
- Make the agent arguments FUNNY — this wins Best Gag

## GO BUILD. CLOCK IS TICKING. 🚀
