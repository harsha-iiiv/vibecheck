"""
REST endpoints for VibeCheck backend.
"""
import uuid
import time
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

from agents.mood_agent import get_current_state, event_queue, SESSION_ID
from agents.protocols import WebSocketEvent
from services import gemini_service, elevenlabs_service, mongodb_service, music_generation_service

router = APIRouter()

# In-memory NFT metadata store (hackathon — no DB needed)
_nft_store: dict[str, dict] = {}


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


class ReactionRequest(BaseModel):
    emoji: str   # "🔥" | "❄️" | "⚡" | "💀" | "🎉"


class MusicGenRequest(BaseModel):
    mood: str = "chill"
    energy: float = 0.5
    genre_hint: str = ""


_REACTION_DELTAS: dict[str, float] = {
    "🔥": 0.30,   # Single tap: winding_down(0.0) → chill(0.30) — one tap crosses boundary
    "❄️": -0.25,
    "⚡": 0.40,   # Single tap: can jump straight to building/peak
    "💀": -0.35,
    "🎉": 0.20,
}


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
    print(f"[TTS] agent={req.agent} text='{req.text[:50]}' key_set={bool(config.ELEVENLABS_API_KEY)} voice_id={config.ELEVENLABS_DEFAULT_VOICE_ID}")
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


@router.post("/reaction")
async def crowd_reaction(req: ReactionRequest):
    """Crowd emoji reaction — instantly nudges energy and triggers vibe broadcast."""
    delta = _REACTION_DELTAS.get(req.emoji, 0.05)
    from agents.mood_agent import apply_reaction
    await apply_reaction(req.emoji, delta)
    return {"status": "ok", "emoji": req.emoji, "delta": delta}


@router.post("/music/generate")
async def generate_music_track(req: MusicGenRequest):
    """
    Generate ambient/beat music using ElevenLabs Sound Generation API.
    Returns MP3 audio bytes on success, or 204 + YouTube fallback hint on failure.
    """
    audio = await music_generation_service.generate_music(
        mood=req.mood,
        energy=req.energy,
        genre_hint=req.genre_hint,
    )
    if audio is None:
        # Signal frontend to fall back to YouTube
        state = get_current_state()
        youtube_id = state.get("music", {}).get("youtube_id")
        return Response(
            status_code=204,
            headers={"X-Fallback-Youtube": youtube_id or ""},
        )
    return Response(content=audio, media_type="audio/mpeg")


@router.post("/skip")
async def skip_track():
    """Skip current track — dequeues next track in DJAgent's queue."""
    from agents.mood_agent import skip_to_next
    await skip_to_next()
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# MongoDB data endpoints
# ---------------------------------------------------------------------------

@router.get("/debug/db")
async def db_stats():
    """Dev only — shows in-memory collection sizes (when MongoDB not connected)."""
    return mongodb_service.get_in_memory_stats()


# ---------------------------------------------------------------------------
# Solana NFT metadata endpoints
# ---------------------------------------------------------------------------

class NftRegisterRequest(BaseModel):
    track_name: str
    artist: str = "VibeCheck AI"
    mood: str = "chill"
    energy: float = 0.5
    bpm: int = 120
    wallet: str = ""          # Phantom wallet address


class NftRegisterResponse(BaseModel):
    mint_id: str
    metadata_url: str
    name: str
    symbol: str = "VIBE"
    description: str


@router.post("/nft/register", response_model=NftRegisterResponse)
async def register_nft(req: NftRegisterRequest):
    """
    Register generated music as NFT metadata.
    Returns a metadata URL that can be used as the NFT URI.
    """
    mint_id = str(uuid.uuid4())[:8].upper()
    name = f"VibeCheck #{mint_id}"
    description = (
        f"AI-generated {req.mood} beat at {req.bpm} BPM, "
        f"energy {req.energy:.0%}. Created live at BeachHacks 9.0 🏖️🤖"
    )
    metadata = {
        "mint_id": mint_id,
        "name": name,
        "symbol": "VIBE",
        "description": description,
        "track_name": req.track_name,
        "artist": req.artist,
        "mood": req.mood,
        "energy": req.energy,
        "bpm": req.bpm,
        "wallet": req.wallet,
        "session_id": SESSION_ID,
        "created_at": int(time.time()),
        "image": "https://vibecheck.live/og.png",
        "attributes": [
            {"trait_type": "Mood", "value": req.mood.title()},
            {"trait_type": "BPM", "value": req.bpm},
            {"trait_type": "Energy", "value": f"{req.energy:.0%}"},
            {"trait_type": "Generator", "value": "ElevenLabs Sound Generation"},
        ],
    }
    _nft_store[mint_id] = metadata
    from config import config
    base = getattr(config, "BASE_URL", "http://localhost:8000")
    metadata_url = f"{base}/api/nft/metadata/{mint_id}"
    return NftRegisterResponse(
        mint_id=mint_id,
        metadata_url=metadata_url,
        name=name,
        description=description,
    )


@router.get("/nft/metadata/{mint_id}")
async def get_nft_metadata(mint_id: str):
    """Serve NFT metadata JSON (Metaplex / OpenSea compatible)."""
    meta = _nft_store.get(mint_id.upper())
    if not meta:
        raise HTTPException(status_code=404, detail="NFT not found")
    return meta
