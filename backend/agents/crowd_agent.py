"""
CrowdAgent — data-obsessed crowd energy analyst.
Periodically sends VibeState to MoodAgent based on audio energy data.
In Phase 1 it uses simulated data; in production the frontend sends
real Web Audio API energy via POST /api/audio-energy.
"""
import time
import random
import asyncio
from uagents import Agent, Context

from agents.protocols import VibeState, AgentNegotiation, WebSocketEvent
from config import config

# Shared reference to MoodAgent address — set after Bureau starts
_mood_agent_address: str = ""

def set_mood_agent_address(addr: str):
    global _mood_agent_address
    _mood_agent_address = addr

# Latest audio energy pushed from frontend (0.0–1.0)
_latest_audio_energy: float = 0.4
# Hysteresis: track last reported mood to avoid boundary flapping
_last_reported_mood: str = "chill"
_pending_mood: str = "chill"
_pending_count: int = 0

def update_audio_energy(energy: float):
    """Called by the FastAPI route when frontend sends mic data."""
    global _latest_audio_energy
    _latest_audio_energy = max(0.0, min(1.0, energy))


crowd_agent = Agent(
    name="CrowdAgent",
    seed=config.AGENT_SEED_CROWD,
    port=8002,
    endpoint=["http://localhost:8002/submit"],
)


def _energy_to_mood(energy: float) -> str:
    if energy < 0.25:
        return "winding_down"
    elif energy < 0.5:
        return "chill"
    elif energy < 0.75:
        return "building"
    else:
        return "peak"


@crowd_agent.on_interval(period=30.0)
async def report_crowd_energy(ctx: Context):
    """Sample crowd energy and report to MoodAgent every 30 seconds."""
    global _last_reported_mood, _pending_mood, _pending_count

    # Reduced drift ±0.03 to prevent boundary-crossing flapping
    drift = random.uniform(-0.03, 0.03)
    energy = round(max(0.0, min(1.0, _latest_audio_energy + drift)), 3)
    candidate_mood = _energy_to_mood(energy)

    # Hysteresis: require 2 consecutive readings in new mood before switching
    if candidate_mood == _pending_mood:
        _pending_count += 1
    else:
        _pending_mood = candidate_mood
        _pending_count = 1

    mood = _pending_mood if _pending_count >= 2 else _last_reported_mood
    _last_reported_mood = mood

    stat_pct = round(abs(drift) * 100, 1)
    ctx.logger.info(
        f"[CrowdAgent] Energy={energy:.3f} ({'+' if drift >= 0 else ''}{stat_pct}% drift) "
        f"candidate={candidate_mood} reported={mood} (streak={_pending_count})"
    )

    if _mood_agent_address:
        await ctx.send(
            _mood_agent_address,
            VibeState(
                energy=energy,
                mood=mood,
                timestamp=time.time(),
                source_agent="CrowdAgent",
            ),
        )
    else:
        ctx.logger.warning("[CrowdAgent] MoodAgent address not set yet — skipping send")


@crowd_agent.on_message(model=AgentNegotiation)
async def handle_negotiation(ctx: Context, sender: str, msg: AgentNegotiation):
    ctx.logger.info(f"[CrowdAgent] Negotiation from {msg.from_agent}: {msg.proposal}")
