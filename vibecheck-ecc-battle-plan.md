# 🎮 VibeCheck — ECC Tactical Battle Plan
## How to Use everything-claude-code to Build VibeCheck in 24 Hours

---

## STEP 0: SETUP (Do this FIRST — 15 minutes)

### 0a. Install ECC Plugin (if not already)
```bash
# In Claude Code terminal:
/plugin marketplace add affaan-m/everything-claude-code
/plugin install everything-claude-code@everything-claude-code
```

### 0b. Install Rules (mandatory — plugin can't distribute these)
```bash
git clone https://github.com/affaan-m/everything-claude-code.git /tmp/ecc
mkdir -p ~/.claude/rules
cp -r /tmp/ecc/rules/common/* ~/.claude/rules/
cp -r /tmp/ecc/rules/python/* ~/.claude/rules/    # for backend
cp -r /tmp/ecc/rules/typescript/* ~/.claude/rules/ # for frontend
```

### 0c. Set Token Optimization (save money during 24hr sprint)
Add to `~/.claude/settings.json`:
```json
{
  "model": "sonnet",
  "env": {
    "MAX_THINKING_TOKENS": "10000",
    "CLAUDE_AUTOCOMPACT_PCT_OVERRIDE": "50"
  }
}
```

### 0d. Create Your Project Directory
```bash
mkdir vibecheck && cd vibecheck
git init
```

### 0e. Create CLAUDE.md in project root
This is the MOST IMPORTANT FILE — it's your project brain that persists across sessions.

```bash
cat > CLAUDE.md << 'EOF'
# VibeCheck — BeachHacks 9.0

## Project Overview
Multi-agent AI event atmosphere engine. 5 autonomous fetch.ai uAgents sense,
react to, and shape the vibe of social gatherings via music, visuals, and voice.

## Tech Stack
- Backend: Python, fetch.ai uAgents, FastAPI, Gemini 2.5 Flash, ElevenLabs, MongoDB Atlas
- Frontend: Next.js 14, Tailwind CSS, Framer Motion, Web Audio API, WebSocket
- Deploy: Vultr Cloud Compute, Docker

## Architecture
- 5 fetch.ai agents: MoodAgent, CrowdAgent, DJAgent, VisualAgent, SocialAgent
- FastAPI WebSocket bridge between agents and frontend
- Gemini API for all agent reasoning
- ElevenLabs TTS for agent voice personalities
- MongoDB Atlas for state persistence
- Generative canvas visuals that respond to vibe state

## File Structure
- backend/ — Python: agents, services, API
- frontend/ — Next.js: dashboard, voice UI, vibe canvas

## Key Constraints
- 24-hour hackathon — speed over perfection
- Must use REAL fetch.ai uAgents on their network (testnet)
- Must integrate: Gemini API, ElevenLabs, MongoDB Atlas, Vultr
- Video demo must be 2 minutes max
- Agent personalities must be FUNNY (targeting Best Gag prize)

## Current Phase
Phase 1: Foundation setup
EOF
```

---

## STEP 1: PLAN THE ARCHITECTURE (30 minutes)

### Use the /plan command with the planner agent
This is where ECC shines — the planner agent creates a detailed implementation blueprint before you write ANY code.

```
/everything-claude-code:plan "Build VibeCheck: a multi-agent event atmosphere engine with 5 fetch.ai uAgents (MoodAgent, CrowdAgent, DJAgent, VisualAgent, SocialAgent) that communicate via fetch.ai protocols. Backend: FastAPI + WebSocket. Frontend: Next.js dashboard with generative canvas, voice UI, agent activity feed. Integrations: Gemini 2.5 Flash for reasoning, ElevenLabs for agent voices, MongoDB Atlas for state, deploy on Vultr. Read CLAUDE.md for full context."
```

**What happens:** The planner agent will:
1. Restate requirements
2. Break into implementation phases
3. Identify risks (HIGH/MEDIUM/LOW)
4. Ask for confirmation before proceeding

**Say YES and let it go.**

### Then use the architect agent for system design
```
Ask Claude: "Use the architect agent to design the inter-agent communication protocol for our 5 fetch.ai uAgents. Define all message models, the negotiation flow, and how the FastAPI WebSocket bridges agent events to the frontend."
```

---

## STEP 2: BUILD BACKEND (Hours 1-6)

### Phase 2a: Agent Foundation (use /tdd for test-driven)

For the backend, use ECC's pipeline pattern:

```
/everything-claude-code:plan "Implement the fetch.ai agent foundation: Create protocols.py with all message models (VibeState, MusicRequest, MusicResponse, VisualUpdate, SocialPrompt, UserCommand, AgentNegotiation). Then create each agent file. Start with MoodAgent as coordinator. Reference the mega-prompt file for exact model definitions."
```

**After plan is approved, for each major component:**
```
/tdd
```
This invokes the tdd-guide agent which will:
1. Write failing tests first (RED)
2. Implement minimal code (GREEN)  
3. Refactor (IMPROVE)

**⚠️ HACKATHON OVERRIDE:** For a 24hr sprint, you can skip TDD for non-critical code.
Instead, just tell Claude directly:
```
"Build the CrowdAgent. Skip tests for now — hackathon speed mode. 
Reference the agent personality and message models from the mega-prompt."
```

### Phase 2b: Service Integrations

Build each service wrapper one at a time:
```
"Implement gemini_service.py — wrapper for Google Gemini 2.5 Flash API. 
Must handle: vibe analysis, music selection, icebreaker generation, 
voice command parsing, agent negotiation reasoning. Use google-genai SDK."
```

```
"Implement elevenlabs_service.py — wrapper for ElevenLabs TTS. 
Each of our 5 agents needs a unique voice_id. Support async audio generation.
Use the elevenlabs Python SDK."
```

```
"Implement mongodb_service.py — MongoDB Atlas connection via pymongo.
Collections: sessions, vibe_history, agent_negotiations, music_history, social_prompts.
Use async operations where possible."
```

### Phase 2c: FastAPI + WebSocket Bridge
```
"Implement the FastAPI server with WebSocket support. 
The server must:
1. Accept WebSocket connections from the frontend
2. Bridge events from fetch.ai agents to connected clients
3. Accept voice commands from frontend and route to MoodAgent
4. Serve REST endpoints for session management
Use the backend-patterns skill knowledge for API design."
```

---

## STEP 3: BUILD FRONTEND (Hours 6-12)

### Use /multi-frontend for frontend orchestration
```
/multi-frontend "Build the VibeCheck Next.js 14 dashboard. Dark cyberpunk theme (#0F0A1A background, #8B5CF6 purple, #06B6D4 cyan, #EC4899 pink accents). Glassmorphism cards. Components needed: VibeCanvas (generative particles), AgentFeed (live negotiations), VoiceInterface (mic + playback), VibeMeter (circular gauge), MusicPanel, SocialCard. Use Tailwind + Framer Motion. WebSocket connection to backend."
```

### For the star feature — Vibe Canvas:
```
"Build the VibeCanvas component using HTML Canvas. It should render:
- Particles that move based on energy level (0-1 float)
- Color interpolation: chill=warm amber → building=cyan/pink → peak=neon strobes
- Animation speed scales with energy
- Smooth transitions when vibe state changes via WebSocket
Use requestAnimationFrame for performance. Keep it under 200 lines."
```

### For Voice Interface:
```
"Build the VoiceInterface component. It needs:
- A mic button that captures audio via Web Audio API
- Send audio energy levels to backend via WebSocket
- Receive and play ElevenLabs audio responses
- Show which agent is currently speaking (with avatar)
- Framer Motion animations for recording state"
```

---

## STEP 4: INTEGRATION & POLISH (Hours 12-18)

### Use /verify for the verification loop
```
/verify
```
This runs the full verification pipeline:
- Build check
- Lint check  
- Test suite
- Type checking

### Use /code-review before submission
```
/code-review
```
The code-reviewer agent will scan for:
- Quality issues
- Security concerns
- Performance problems
- Missing error handling

### Use /build-fix if anything breaks
```
/build-fix
```
The build-error-resolver agent fixes compilation/runtime errors.

---

## STEP 5: DEPLOY TO VULTR (Hour 18-19)

```
"Create a Dockerfile for the backend and a docker-compose.yml for the full stack.
Then help me deploy to a Vultr Cloud Compute instance.
Use the deployment-patterns and docker-patterns skills for best practices.
Keep it simple — single instance, docker-compose up."
```

---

## STEP 6: SUBMISSION PREP (Hours 20-24)

### Generate README with /update-docs
```
/update-docs
```

### Or manually:
```
"Generate the final README.md for our GitHub repo. Include:
- Project description matching Devpost requirements
- Architecture diagram (ASCII)
- Tech stack with all integrations listed
- Setup instructions
- Team members
- Screenshots placeholder
Reference the SUBMISSION.md section from the mega-prompt."
```

---

## KEY ECC COMMANDS CHEAT SHEET FOR THE HACKATHON

| When | Command | What It Does |
|------|---------|--------------|
| Starting a new component | `/plan "description"` | Planner creates implementation blueprint |
| Writing code with tests | `/tdd` | TDD workflow: test → implement → refactor |
| Stuck on architecture | Ask for `architect` agent | System design decisions |
| Build is broken | `/build-fix` | Auto-diagnose and fix build errors |
| Code quality check | `/code-review` | Full quality + security review |
| Full verification | `/verify` | Build + lint + test + typecheck |
| Between major phases | `/compact` | Free up context window |
| Switching topics entirely | `/clear` | Reset context (free, instant) |
| Check spending | `/cost` | Monitor token usage |
| Need Opus for hard problem | `/model opus` | Switch to Opus temporarily |
| Back to fast mode | `/model sonnet` | Switch back to Sonnet |
| Multi-service coordination | `/multi-backend` | Backend orchestration across services |
| Frontend components | `/multi-frontend` | Frontend orchestration |
| Generate project docs | `/update-docs` | Auto-generate documentation |
| Test coverage check | `/test-coverage` | Verify coverage levels |

---

## ECC AGENTS RELEVANT TO VIBECHECK

| Agent | When to Use It |
|-------|----------------|
| **planner** | Start of each phase — creates implementation plan |
| **architect** | Designing agent communication protocols, WebSocket architecture |
| **tdd-guide** | Writing critical backend tests (agent message passing) |
| **code-reviewer** | Before submission — catch issues |
| **build-error-resolver** | When builds break (they will at 3am) |
| **python-reviewer** | Review backend Python code quality |
| **typescript-reviewer** | Review frontend TypeScript code quality |
| **security-reviewer** | Quick security pass before submission |
| **doc-updater** | Generate/update README and docs |

---

## ECC SKILLS RELEVANT TO VIBECHECK

| Skill | Why It Matters |
|-------|----------------|
| **backend-patterns** | API design, WebSocket patterns, service architecture |
| **frontend-patterns** | React/Next.js component patterns, state management |
| **api-design** | REST endpoint design for the FastAPI server |
| **deployment-patterns** | Docker + Vultr deployment |
| **docker-patterns** | Dockerfile and docker-compose best practices |
| **python-patterns** | Python idioms for the backend |
| **coding-standards** | Universal code quality standards |

---

## TACTICAL TIPS FOR SPEED

### 1. Use /compact BETWEEN phases, not during
```
# After finishing backend agents:
/compact
# Then start frontend work with fresh context
```

### 2. Use /clear when switching backend ↔ frontend
```
# Done with Python backend? Before starting React frontend:
/clear
# Then paste key context: "I'm building the frontend for VibeCheck. Here's the WebSocket API contract: [paste endpoints]"
```

### 3. Switch to Opus for HARD problems only
```
# Agent communication protocol design → Opus
/model opus
"Design the optimal fetch.ai agent negotiation protocol..."

# Routine component building → Sonnet  
/model sonnet
"Build the SocialCard component with Tailwind..."
```

### 4. Use the Sequential Thinking MCP for complex decisions
```
# When facing architecture decisions:
"Use sequential thinking to decide: should the agents run in a Bureau (single process)
or as separate processes? Consider: hackathon time constraint, debugging ease, 
demo reliability, and fetch.ai best practices."
```

### 5. Don't fight Claude — if something is too complex, SIMPLIFY
```
# If fetch.ai agent-to-agent comms are buggy:
"Simplify: Instead of real fetch.ai network messaging, use a local Bureau 
with all agents in one process. They still use uAgents framework but communicate 
locally. We can mention the architecture supports distributed deployment."
```

### 6. Keep the demo path working AT ALL TIMES
```
# After every major change, test the demo flow:
"Run a quick smoke test: 
1. Start backend
2. Open frontend
3. Click mic button → send 'more energy' 
4. Verify: agent feed updates, visuals change, voice response plays
If anything is broken, fix it before adding new features."
```

---

## THE OPENING MESSAGE TO PASTE INTO CLAUDE CODE

When you open Claude Code in VS Code, paste this as your FIRST message:

```
Read the file vibecheck-claude-code-prompt.md in my project root — it contains 
the complete specification for VibeCheck, a multi-agent event atmosphere engine 
I'm building for BeachHacks 9.0 (24-hour hackathon starting NOW).

Also read CLAUDE.md for project context.

I have the everything-claude-code plugin installed. Let's use the planner agent 
to create the Phase 1 implementation plan. We're starting with:
1. Project initialization (repos, .env, dependencies)
2. fetch.ai agent foundation (protocols.py + MoodAgent)
3. Basic FastAPI server with WebSocket

Use /plan to create the blueprint, then let's execute immediately.
Time is critical — hackathon speed mode. Working code > perfect code.
```

---

## EMERGENCY PLAYBOOK (When things go wrong at 3am)

| Problem | Solution |
|---------|----------|
| fetch.ai agents won't register | Use `network="testnet"` and local Bureau mode. Skip Almanac registration for the demo. |
| WebSocket connection dropping | Add reconnection logic with exponential backoff. Use `socket.io` if raw WS is too flaky. |
| Gemini API rate limited | Cache responses. Use shorter prompts. Have fallback static responses. |
| ElevenLabs quota exceeded | Pre-generate 5-10 common agent responses as audio files. Play cached audio for demo. |
| MongoDB connection issues | Fall back to in-memory dict. MongoDB is for the "Best Use of MongoDB" prize — it can be simple. |
| Frontend looks ugly | Focus on the VibeCanvas (that's the wow factor). The rest can be basic Tailwind cards. |
| Can't deploy to Vultr in time | Run locally for the demo. Mention Vultr in the submission as "deployment target." |
| Nothing works | Strip to minimum: 1 agent + 1 API + 1 page. A working simple demo beats a broken complex one. |

---

## GO. THE CLOCK IS TICKING. 🚀

Remember the ECC motto: **RESEARCH → PLAN → IMPLEMENT → REVIEW → VERIFY**

But for a hackathon: **PLAN → IMPLEMENT → DEMO → SUBMIT** 

Skip what doesn't help you win. Ship what does.
