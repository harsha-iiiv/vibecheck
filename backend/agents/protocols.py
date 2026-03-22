"""
VibeCheck — fetch.ai uAgent message models and shared types.
All inter-agent communication uses these Pydantic-based Models.
"""
import time
from typing import Optional
from uagents import Model
from pydantic import BaseModel


# ---------------------------------------------------------------------------
# fetch.ai uAgent Message Models
# ---------------------------------------------------------------------------

class VibeState(Model):
    """CrowdAgent → MoodAgent: current crowd energy snapshot."""
    energy: float          # 0.0 (dead quiet) to 1.0 (maximum hype)
    mood: str              # "chill" | "building" | "peak" | "winding_down"
    timestamp: float
    source_agent: str


class MusicRequest(Model):
    """MoodAgent → DJAgent: request a track for the target energy."""
    target_energy: float
    genre_preference: str
    reason: str            # "crowd energy dropping" | "user requested high energy"


class MusicResponse(Model):
    """DJAgent → MoodAgent: selected track details."""
    track_name: str
    artist: str
    bpm: int
    energy_level: float
    spotify_uri: Optional[str] = None
    youtube_id: Optional[str] = None
    thumbnail_url: Optional[str] = None


class VisualUpdate(Model):
    """MoodAgent → VisualAgent: update the generative canvas parameters."""
    vibe_state: str                  # "chill" | "building" | "peak" | "winding_down"
    color_palette: list              # e.g. ["#FF00FF", "#00FFFF", "#8B5CF6"]
    animation_style: str             # "pulse" | "wave" | "particle_burst" | "calm_flow"
    intensity: float                 # 0.0–1.0


class SocialPrompt(Model):
    """MoodAgent → SocialAgent / SocialAgent → MoodAgent: icebreaker payload."""
    prompt_type: str       # "icebreaker" | "challenge" | "trivia" | "dare"
    content: str
    energy_match: float


class UserCommand(Model):
    """API → MoodAgent: parsed voice/text command from the user."""
    text: str
    audio_energy: float    # 0.0–1.0 from Web Audio API


class AgentNegotiation(Model):
    """Any agent ↔ MoodAgent: propose, agree, or disagree on a vibe change."""
    from_agent: str
    to_agent: str
    proposal: str          # "I want to switch to high-energy music"
    reasoning: str         # "Crowd energy has been rising for 5 minutes"
    agreed: bool


# ---------------------------------------------------------------------------
# WebSocket event envelope (Pydantic, NOT a uAgent Model — for frontend)
# ---------------------------------------------------------------------------

class WebSocketEvent(BaseModel):
    """Broadcast envelope sent over WebSocket to the Next.js frontend."""
    event_type: str        # "vibe_update" | "negotiation" | "music" | "visual" | "social" | "agent_log"
    agent: str             # which agent generated this event
    data: dict             # event-specific payload
    timestamp: float = 0.0

    def __init__(self, **data):
        if "timestamp" not in data or data["timestamp"] == 0.0:
            data["timestamp"] = time.time()
        super().__init__(**data)


# ---------------------------------------------------------------------------
# Vibe color palettes — shared constants used by VisualAgent + frontend
# ---------------------------------------------------------------------------

VIBE_PALETTES = {
    "chill":        ["#8B5CF6", "#6D28D9", "#F59E0B", "#78350F"],
    "building":     ["#06B6D4", "#0E7490", "#EC4899", "#9D174D"],
    "peak":         ["#FF00FF", "#00FFFF", "#FF6B00", "#FFFFFF"],
    "winding_down": ["#374151", "#6B7280", "#8B5CF6", "#4B5563"],
}

VIBE_ANIMATION_STYLES = {
    "chill":        "calm_flow",
    "building":     "wave",
    "peak":         "particle_burst",
    "winding_down": "pulse",
}
