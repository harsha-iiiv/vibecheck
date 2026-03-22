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
