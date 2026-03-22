"""
MoodAgent — The wise coordinator of VibeCheck.
Orchestrates all other agents. Handles user voice commands.
Runs inside a fetch.ai Bureau (single process, local messaging).
"""
import asyncio
import time
import random
from uagents import Agent, Context, Bureau

from agents.protocols import (
    VibeState, MusicRequest, MusicResponse,
    VisualUpdate, SocialPrompt, UserCommand,
    AgentNegotiation, WebSocketEvent,
    VIBE_PALETTES, VIBE_ANIMATION_STYLES,
)
from services import gemini_service, mongodb_service
from config import config

# Addresses for sub-agents — set by run.py after Bureau builds all agents
_agent_addresses: dict = {}

def register_agent_address(name: str, address: str):
    _agent_addresses[name] = address

# Active session ID (one per server run — Phase 3 adds multi-session)
import uuid
SESSION_ID = str(uuid.uuid4())[:8]

# ---------------------------------------------------------------------------
# Shared async queue — agents push WebSocketEvents here, FastAPI reads them
# ---------------------------------------------------------------------------
event_queue: asyncio.Queue = asyncio.Queue()

# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# Music queue — DJAgent populates this with related tracks
# ---------------------------------------------------------------------------
_music_queue: list[dict] = []


# ---------------------------------------------------------------------------
# Global vibe state (in-memory — also persisted to MongoDB in Phase 2)
# ---------------------------------------------------------------------------
_state = {
    "energy": 0.4,
    "mood": "chill",
    "last_updated": time.time(),
    "music": {"track_name": "The Less I Know the Better", "artist": "Tame Impala", "bpm": 116, "energy_level": 0.40, "dj_comment": "Setting the vibe..."},
    "social": {"content": "Welcome to VibeCheck! 🎉", "prompt_type": "icebreaker"},
}


def get_current_state() -> dict:
    return dict(_state)


def set_music_queue(queue: list[dict]):
    global _music_queue
    _music_queue = list(queue)


async def apply_reaction(emoji: str, delta: float):
    """Instantly nudge energy from a crowd reaction, broadcast update + trigger on mood change."""
    global _prev_mood
    prev = _prev_mood
    _state["energy"] = round(max(0.0, min(1.0, _state["energy"] + delta)), 2)
    # Persist reaction energy to CrowdAgent so it doesn't snap back on next tick
    try:
        from agents.crowd_agent import update_audio_energy
        update_audio_energy(_state["energy"])
    except Exception:
        pass
    e = _state["energy"]
    if e < 0.25:
        _state["mood"] = "winding_down"
    elif e < 0.5:
        _state["mood"] = "chill"
    elif e < 0.75:
        _state["mood"] = "building"
    else:
        _state["mood"] = "peak"
    new_mood = _state["mood"]

    _reaction_lines = {
        "🔥": "THE CROWD IS ON FIRE!! 🔥",
        "❄️": "Cooling it down... nice and easy ❄️",
        "⚡": "MAXIMUM OVERDRIVE — WE ARE PEAKING ⚡",
        "💀": "The energy just... flatlined 💀",
        "🎉": "PARTY MODE ACTIVATED 🎉",
    }
    await _broadcast("vibe_update", "CrowdAgent", {
        "energy": _state["energy"],
        "mood": new_mood,
        "agent_line": _reaction_lines.get(emoji, f"{emoji} reaction received!"),
        "reaction": emoji,
    })

    # Always fire a visual update immediately so canvas responds to every reaction
    palette = VIBE_PALETTES.get(new_mood, VIBE_PALETTES["chill"])
    anim_style = VIBE_ANIMATION_STYLES.get(new_mood, "calm_flow")
    await _broadcast("visual", "VisualAgent", {
        "vibe_state": new_mood,
        "color_palette": palette,
        "animation_style": anim_style,
        "intensity": _state["energy"],
        "visual_comment": _reaction_lines.get(emoji, ""),
    })

    # On mood transition: fire music, social, negotiation drama
    if new_mood != prev:
        _prev_mood = new_mood
        # Request new music for the new mood (no ctx — will use Gemini direct fallback)
        await _request_music(None, _state["energy"], new_mood)
        # Generate new icebreaker
        social = gemini_service.generate_icebreaker(_state["energy"])
        _state["social"] = {
            "content": social.get("content", ""),
            "prompt_type": social.get("prompt_type", "icebreaker"),
        }
        await _broadcast("social", "SocialAgent", {
            **_state["social"],
            "social_comment": social.get("social_comment", "LET'S GOOO!"),
            "energy_match": _state["energy"],
        })
        # Inject negotiation drama
        neg = _TRANSITION_NEGOTIATIONS.get((prev, new_mood))
        if neg:
            await _broadcast("negotiation", neg["from_agent"], {
                "from_agent": neg["from_agent"],
                "to_agent": neg["to_agent"],
                "proposal": neg["proposal"],
                "reasoning": neg["reasoning"],
                "agreed": neg["agreed"],
            })


async def skip_to_next():
    """Pop the next track from the queue and broadcast it."""
    global _music_queue
    if not _music_queue:
        return
    next_track = _music_queue.pop(0)
    _apply_music_track(next_track, _state["energy"])
    await _broadcast("music", "DJAgent", _state["music"])
    await _broadcast("music_queue", "DJAgent", {"queue": _music_queue[:3]})
    print(f"[MoodAgent] Skipped to: {_state['music']['track_name']}")


async def _broadcast(event_type: str, agent: str, data: dict):
    """Push event to the WebSocket queue."""
    evt = WebSocketEvent(event_type=event_type, agent=agent, data=data)
    try:
        event_queue.put_nowait(evt.model_dump())
    except asyncio.QueueFull:
        pass  # Drop if queue is full — never block the agent loop


# ---------------------------------------------------------------------------
# MoodAgent definition
# ---------------------------------------------------------------------------
mood_agent = Agent(
    name="MoodAgent",
    seed=config.AGENT_SEED_MOOD,
    port=8001,
    endpoint=["http://localhost:8001/submit"],
)


_tick_count = 7   # Start at 7 so music + social fire on the very first tick (15s after boot)
_prev_mood: str = "chill"

# Negotiation scripts triggered on mood transitions (adds drama to the UI)
_TRANSITION_NEGOTIATIONS = {
    ("chill", "building"): {
        "from_agent": "DJAgent",
        "to_agent": "MoodAgent",
        "proposal": "Energy is climbing — switching to hyperpop. Don't @ me.",
        "reasoning": "Crowd metrics show 40% uptick in movement. Time to escalate.",
        "agreed": True,
    },
    ("building", "peak"): {
        "from_agent": "DJAgent",
        "to_agent": "CrowdAgent",
        "proposal": "WE ARE GOING FULL EDM. No negotiations. This is peak.",
        "reasoning": "Energy threshold breached. Mathematical inevitability.",
        "agreed": True,
    },
    ("peak", "building"): {
        "from_agent": "CrowdAgent",
        "to_agent": "DJAgent",
        "proposal": "Sustained peak detected. 78.3% exhaustion probability. Cool it.",
        "reasoning": "Biometric data suggests crowd needs a 30-second breather.",
        "agreed": True,
    },
    ("building", "chill"): {
        "from_agent": "MoodAgent",
        "to_agent": "DJAgent",
        "proposal": "The vibe whispers... slow down. Let the energy breathe.",
        "reasoning": "Crowd needs grounding. We go lo-fi or we lose them.",
        "agreed": True,
    },
    ("chill", "winding_down"): {
        "from_agent": "SocialAgent",
        "to_agent": "MoodAgent",
        "proposal": "Engagement dropping 62%. Deploy icebreaker protocol immediately.",
        "reasoning": "Social cohesion metrics critical. Intervention required.",
        "agreed": True,
    },
    ("winding_down", "chill"): {
        "from_agent": "CrowdAgent",
        "to_agent": "SocialAgent",
        "proposal": "Icebreaker worked — 23% engagement recovery. Nice.",
        "reasoning": "Post-intervention data confirms social catalyst was effective.",
        "agreed": True,
    },
    ("winding_down", "building"): {
        "from_agent": "SocialAgent",
        "to_agent": "DJAgent",
        "proposal": "Crowd went from dead to building in seconds. What did you PUT in those drinks?",
        "reasoning": "Unexpected energy spike. Deploying hype music immediately.",
        "agreed": True,
    },
    ("winding_down", "peak"): {
        "from_agent": "DJAgent",
        "to_agent": "MoodAgent",
        "proposal": "FROM ZERO TO PEAK?? I'm skipping every transition and dropping the banger NOW.",
        "reasoning": "Statistically impossible but I'm not arguing with the data.",
        "agreed": True,
    },
    ("peak", "winding_down"): {
        "from_agent": "CrowdAgent",
        "to_agent": "MoodAgent",
        "proposal": "Catastrophic energy collapse detected. 94% engagement loss. Send help.",
        "reasoning": "Someone unplugged the snacks table. Crowd not happy.",
        "agreed": True,
    },
    ("chill", "peak"): {
        "from_agent": "DJAgent",
        "to_agent": "VisualAgent",
        "proposal": "Skipped building ENTIRELY. Full send. Crank the visuals to 11.",
        "reasoning": "Physics says this shouldn't happen. Crowd disagrees.",
        "agreed": True,
    },
    ("building", "winding_down"): {
        "from_agent": "MoodAgent",
        "to_agent": "SocialAgent",
        "proposal": "Energy died mid-build. Deploy emergency icebreaker protocol NOW.",
        "reasoning": "This is a disaster. Who let the DJ play that?",
        "agreed": True,
    },
}


@mood_agent.on_interval(period=15.0)
async def vibe_check_loop(ctx: Context):
    """Periodic vibe analysis — runs every 15s."""
    global _tick_count, _prev_mood
    _tick_count += 1

    current_energy = _state["energy"]
    simulated_history = [
        round(current_energy + random.uniform(-0.1, 0.1), 2)
        for _ in range(5)
    ]
    simulated_history = [max(0.0, min(1.0, e)) for e in simulated_history]

    avg_energy = round(sum(simulated_history) / len(simulated_history), 2)
    _state["energy"] = avg_energy
    _state["last_updated"] = time.time()

    # Call Gemini every 4th tick (every 60s) — saves quota
    if _tick_count % 4 == 0:
        result = gemini_service.analyze_vibe(simulated_history, _state["mood"])
        new_mood = result.get("next_mood", _state["mood"])
        agent_line = result.get("agent_line", "The vibe... it shifts.")
        _state["mood"] = new_mood
        reasoning = result.get("reasoning", "")
    else:
        new_mood = _state["mood"]
        agent_line = ""
        reasoning = ""

    mongodb_service.log_vibe(SESSION_ID, avg_energy, new_mood)
    ctx.logger.info(f"[MoodAgent] Vibe check → mood={new_mood} energy={avg_energy:.2f}")

    await _broadcast("vibe_update", "MoodAgent", {
        "energy": avg_energy,
        "mood": new_mood,
        "agent_line": agent_line,
        "reasoning": reasoning,
    })

    # Visual update — use palette directly, skip Gemini call to save quota
    palette = VIBE_PALETTES.get(new_mood, VIBE_PALETTES["chill"])
    anim_style = VIBE_ANIMATION_STYLES.get(new_mood, "calm_flow")
    await _broadcast("visual", "VisualAgent", {
        "vibe_state": new_mood,
        "color_palette": palette,
        "animation_style": anim_style,
        "intensity": _state["energy"],
        "visual_comment": "",
    })

    # Every 8th tick (2 min) → music update
    if _tick_count % 8 == 0:
        await _request_music(ctx, _state["energy"], new_mood)

    # Every 6th tick (90s) → icebreaker update
    if _tick_count % 6 == 0:
        await _generate_social(ctx)


async def _generate_social(ctx=None):
    """Generate and broadcast an icebreaker/social prompt."""
    social = gemini_service.generate_icebreaker(_state["energy"])
    _state["social"] = {
        "content": social.get("content", "Find someone you haven't met and share your best hack idea!"),
        "prompt_type": social.get("prompt_type", "icebreaker"),
    }
    await _broadcast("social", "SocialAgent", {
        **_state["social"],
        "social_comment": social.get("social_comment", "LET'S GOOO!"),
        "energy_match": _state["energy"],
    })
    mongodb_service.log_social_prompt(
        SESSION_ID, _state["social"]["prompt_type"],
        _state["social"]["content"], _state["energy"]
    )


async def _request_music(ctx: Context, energy: float, mood: str):
    """Send MusicRequest to DJAgent (real message if address known, else Gemini direct)."""
    genre_map = {"chill": "lo-fi/ambient", "building": "electronic/indie", "peak": "EDM/hype", "winding_down": "acoustic/downtempo"}
    genre = genre_map.get(mood, "electronic")
    reason = f"Crowd mood is '{mood}' at energy {energy:.2f}"

    dj_addr = _agent_addresses.get("dj")
    if dj_addr and ctx:
        # Real fetch.ai message — DJAgent will respond with MusicResponse
        await ctx.send(dj_addr, MusicRequest(
            target_energy=energy,
            genre_preference=genre,
            reason=reason,
        ))
        return  # DJAgent handles the rest via handle_music_response

    # Fallback: call Gemini directly (no DJAgent address yet)
    track = gemini_service.select_music(energy, genre, reason)
    _apply_music_track(track, energy)
    await _broadcast("music", "DJAgent", _state["music"])
    mongodb_service.log_music(
        SESSION_ID,
        _state["music"]["track_name"], _state["music"]["artist"],
        _state["music"]["bpm"], energy, "MoodAgent-fallback"
    )
    print(f"[DJAgent-fallback] Now playing: {_state['music']['track_name']}")


def _apply_music_track(track: dict, energy: float):
    _state["music"] = {
        "track_name": track.get("track_name", "Unknown"),
        "artist": track.get("artist", "Unknown"),
        "bpm": track.get("bpm", 120),
        "energy_level": track.get("energy_level", energy),
        "dj_comment": track.get("dj_comment", "Here's the track. You're welcome."),
        "youtube_id": track.get("youtube_id"),
        "thumbnail_url": track.get("thumbnail_url"),
    }


async def handle_user_command_direct(text: str, audio_energy: float, intent: dict):
    """
    Called directly from FastAPI routes (no uAgent ctx needed).
    Parses intent, updates vibe state, selects music + YouTube ID, broadcasts.
    """
    from services import youtube_music_service

    target_energy = float(intent.get("target_energy", _state["energy"]))
    direction = intent.get("mood_direction", "hold")

    if direction == "up":
        _state["energy"] = min(1.0, target_energy)
    elif direction == "down":
        _state["energy"] = max(0.0, target_energy)
    else:
        _state["energy"] = round(target_energy, 2)

    e = _state["energy"]
    if e < 0.25:
        _state["mood"] = "winding_down"
    elif e < 0.5:
        _state["mood"] = "chill"
    elif e < 0.75:
        _state["mood"] = "building"
    else:
        _state["mood"] = "peak"

    genre_map = {
        "chill": "lo-fi/ambient",
        "building": "electronic/indie",
        "peak": "EDM/hype",
        "winding_down": "acoustic/downtempo",
    }
    genre = genre_map.get(_state["mood"], "electronic")
    reason = f"User command: '{text}' — energy {_state['energy']:.2f}"

    await _broadcast("vibe_update", "MoodAgent", {
        "energy": _state["energy"],
        "mood": _state["mood"],
        "agent_line": intent.get("summary", f"On it. {text}"),
        "triggered_by": "user",
    })

    track = gemini_service.select_music(_state["energy"], genre, reason)
    query = f"{track.get('track_name', '')} {track.get('artist', '')}".strip()
    yt = youtube_music_service.search_track(query) if query else None

    _apply_music_track({
        **track,
        "youtube_id": yt.get("youtube_id") if yt else None,
        "thumbnail_url": yt.get("thumbnail_url") if yt else None,
        "dj_comment": f"DJAgent: '{intent.get('summary', text)}'",
    }, _state["energy"])

    await _broadcast("music", "DJAgent", _state["music"])
    mongodb_service.log_music(
        SESSION_ID,
        _state["music"]["track_name"], _state["music"]["artist"],
        _state["music"]["bpm"], _state["energy"], "command",
    )
    print(f"[MoodAgent] Command music: {_state['music']['track_name']} — {_state['music']['artist']}")


@mood_agent.on_message(model=MusicResponse)
async def handle_music_response(ctx: Context, sender: str, msg: MusicResponse):
    """DJAgent has selected a track — update state and broadcast."""
    _state["music"] = {
        "track_name": msg.track_name,
        "artist": msg.artist,
        "bpm": msg.bpm,
        "energy_level": msg.energy_level,
        "dj_comment": "Hand-curated by DJAgent.",
        "youtube_id": msg.youtube_id,
        "thumbnail_url": msg.thumbnail_url,
    }
    await _broadcast("music", "DJAgent", _state["music"])
    # Broadcast queue if DJAgent populated it
    if msg.queue:
        set_music_queue(msg.queue)
        await _broadcast("music_queue", "DJAgent", {"queue": msg.queue[:3]})
    mongodb_service.log_music(
        SESSION_ID, msg.track_name, msg.artist, msg.bpm, msg.energy_level, "DJAgent"
    )
    ctx.logger.info(f"[MoodAgent] Music confirmed: {msg.track_name} — {msg.artist}")


@mood_agent.on_message(model=VibeState)
async def handle_vibe_state(ctx: Context, sender: str, msg: VibeState):
    """Receive crowd energy data from CrowdAgent — immediately trigger on mood change."""
    global _prev_mood
    prev = _prev_mood
    _state["energy"] = msg.energy
    _state["mood"] = msg.mood
    _state["last_updated"] = msg.timestamp

    ctx.logger.info(f"[MoodAgent] Got VibeState from {sender}: energy={msg.energy:.2f} mood={msg.mood}")

    await _broadcast("agent_log", "CrowdAgent", {
        "message": f"Energy reading: {msg.energy:.2f} | Mood: {msg.mood}",
        "energy": msg.energy,
        "mood": msg.mood,
    })
    await _broadcast("vibe_update", "MoodAgent", {
        "energy": msg.energy,
        "mood": msg.mood,
        "agent_line": "",
        "reasoning": "",
    })

    # Immediately fire visual update on every crowd signal
    palette = VIBE_PALETTES.get(msg.mood, VIBE_PALETTES["chill"])
    anim_style = VIBE_ANIMATION_STYLES.get(msg.mood, "calm_flow")
    await _broadcast("visual", "VisualAgent", {
        "vibe_state": msg.mood,
        "color_palette": palette,
        "animation_style": anim_style,
        "intensity": msg.energy,
        "visual_comment": "",
    })

    # On mood transition: fire music + social + negotiation drama
    if msg.mood != prev:
        _prev_mood = msg.mood
        ctx.logger.info(f"[MoodAgent] MOOD SHIFT {prev} → {msg.mood} — triggering full update")

        # Music: immediate request on mood change
        await _request_music(ctx, msg.energy, msg.mood)

        # Social: generate new icebreaker for the new mood
        await _generate_social(ctx)

        # Inject negotiation drama for the transition
        neg = _TRANSITION_NEGOTIATIONS.get((prev, msg.mood))
        if neg:
            await _broadcast("negotiation", neg["from_agent"], {
                "from_agent": neg["from_agent"],
                "to_agent": neg["to_agent"],
                "proposal": neg["proposal"],
                "reasoning": neg["reasoning"],
                "agreed": neg["agreed"],
            })


@mood_agent.on_message(model=UserCommand)
async def handle_user_command(ctx: Context, sender: str, msg: UserCommand):
    """Process voice/text command from the frontend via FastAPI."""
    ctx.logger.info(f"[MoodAgent] User command: '{msg.text}' audio_energy={msg.audio_energy:.2f}")

    intent = gemini_service.parse_user_command(msg.text, msg.audio_energy)
    target_energy = intent.get("target_energy", _state["energy"])
    direction = intent.get("mood_direction", "hold")
    summary = intent.get("summary", msg.text)

    await _broadcast("agent_log", "MoodAgent", {
        "message": f"User said: \"{msg.text}\" → {summary}",
        "intent": intent,
    })

    # Update vibe toward target
    _state["energy"] = round(float(target_energy), 2)
    e = _state["energy"]
    if e < 0.25:
        _state["mood"] = "winding_down"
    elif e < 0.5:
        _state["mood"] = "chill"
    elif e < 0.75:
        _state["mood"] = "building"
    else:
        _state["mood"] = "peak"

    # Broadcast the updated state
    await _broadcast("vibe_update", "MoodAgent", {
        "energy": _state["energy"],
        "mood": _state["mood"],
        "agent_line": f"Command received. {summary}",
        "triggered_by": "user",
    })

    # Trigger music + social updates
    await _request_music(ctx, _state["energy"], _state["mood"])

    # Generate icebreaker — route to SocialAgent if address known, else direct
    if any(word in msg.text.lower() for word in ["game", "social", "icebreaker", "challenge", "fun"]):
        social_addr = _agent_addresses.get("social")
        if social_addr and ctx:
            await ctx.send(social_addr, SocialPrompt(
                prompt_type="challenge",
                content="",
                energy_match=_state["energy"],
            ))
        else:
            social = gemini_service.generate_icebreaker(_state["energy"])
            _state["social"] = {
                "content": social.get("content", ""),
                "prompt_type": social.get("prompt_type", "challenge"),
            }
            await _broadcast("social", "SocialAgent", {
                **_state["social"],
                "social_comment": social.get("social_comment", "LET'S GOOO!"),
                "energy_match": _state["energy"],
            })
            mongodb_service.log_social_prompt(
                SESSION_ID, _state["social"]["prompt_type"],
                _state["social"]["content"], _state["energy"]
            )


@mood_agent.on_message(model=AgentNegotiation)
async def handle_negotiation(ctx: Context, sender: str, msg: AgentNegotiation):
    """Receive, log, and broadcast agent negotiations."""
    ctx.logger.info(f"[MoodAgent] Negotiation from {msg.from_agent}: '{msg.proposal}'")
    mongodb_service.log_negotiation(
        SESSION_ID, msg.from_agent, msg.to_agent,
        msg.proposal, msg.reasoning, msg.agreed,
    )
    await _broadcast("negotiation", msg.from_agent, {
        "from_agent": msg.from_agent,
        "to_agent": msg.to_agent,
        "proposal": msg.proposal,
        "reasoning": msg.reasoning,
        "agreed": msg.agreed,
    })
