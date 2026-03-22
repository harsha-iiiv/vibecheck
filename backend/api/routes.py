"""
REST endpoints for VibeCheck backend.
"""
from fastapi import APIRouter
from fastapi.responses import Response
from pydantic import BaseModel

from agents.mood_agent import get_current_state, event_queue, SESSION_ID
from agents.protocols import WebSocketEvent
from services import gemini_service, elevenlabs_service, mongodb_service

router = APIRouter()


class CommandRequest(BaseModel):
    text: str
    audio_energy: float = 0.5


class CommandResponse(BaseModel):
    status: str
    message: str
    session_id: str


class AudioEnergyUpdate(BaseModel):
    energy: float  # 0.0–1.0 from Web Audio API


class TTSRequest(BaseModel):
    agent: str   # "mood" | "dj" | "crowd" | "visual" | "social"
    text: str


# ---------------------------------------------------------------------------
# Health + state
# ---------------------------------------------------------------------------

@router.get("/health")
async def health():
    return {"status": "ok", "service": "VibeCheck API", "session_id": SESSION_ID}


@router.get("/state")
async def get_state():
    """Current vibe state snapshot — for initial frontend load."""
    return {**get_current_state(), "session_id": SESSION_ID}


# ---------------------------------------------------------------------------
# Voice / text command
# ---------------------------------------------------------------------------

@router.post("/command", response_model=CommandResponse)
async def send_command(req: CommandRequest):
    """
    Accept a voice/text command from the frontend.
    Parses intent, updates vibe state, selects music immediately.
    """
    intent = gemini_service.parse_user_command(req.text, req.audio_energy)

    # Update audio energy so CrowdAgent picks it up
    from agents.crowd_agent import update_audio_energy
    update_audio_energy(req.audio_energy)

    # Trigger music + vibe update directly (no uAgent ctx needed)
    from agents.mood_agent import handle_user_command_direct
    await handle_user_command_direct(req.text, req.audio_energy, intent)

    return CommandResponse(
        status="accepted",
        message=intent.get("summary", f"Processing: {req.text}"),
        session_id=SESSION_ID,
    )


# ---------------------------------------------------------------------------
# Audio energy from Web Audio API (frontend mic)
# ---------------------------------------------------------------------------

@router.post("/audio-energy")
async def update_audio_energy(req: AudioEnergyUpdate):
    """Frontend sends mic energy level — CrowdAgent uses this for real crowd sensing."""
    from agents.crowd_agent import update_audio_energy
    update_audio_energy(req.energy)
    return {"status": "ok", "energy": req.energy}


# ---------------------------------------------------------------------------
# TTS — convert agent text to ElevenLabs speech
# ---------------------------------------------------------------------------

@router.post("/tts")
async def text_to_speech(req: TTSRequest):
    """
    Generate speech for an agent line.
    Returns MP3 audio bytes, or 204 No Content if TTS is not configured.
    """
    from config import config
    print(f"[TTS] agent={req.agent} text='{req.text[:50]}' key_set={bool(config.ELEVENLABS_API_KEY)} voice_id={config.ELEVENLABS_VOICE_IDS.get(req.agent, 'MISSING')}")
    audio = elevenlabs_service.speak(req.agent, req.text)
    if audio is None:
        return Response(status_code=204)
    return Response(content=audio, media_type="audio/mpeg")


# ---------------------------------------------------------------------------
# MongoDB data endpoints
# ---------------------------------------------------------------------------

@router.get("/history/vibe")
async def get_vibe_history(limit: int = 50):
    return {"history": mongodb_service.get_vibe_history(SESSION_ID, limit)}


@router.get("/history/negotiations")
async def get_negotiations(limit: int = 20):
    return {"negotiations": mongodb_service.get_negotiations(SESSION_ID, limit)}


@router.get("/debug/db")
async def db_stats():
    """Dev only — shows in-memory collection sizes (when MongoDB not connected)."""
    return mongodb_service.get_in_memory_stats()
