"""
ElevenLabs TTS service — distinct voices per agent, eleven_v3 model.
Falls back to None (no audio) if API key is not set.
"""
from typing import Optional
from config import config

# Lazy client init
_client = None

# Map agent names → (voice_id, voice_settings)
# Settings tuned per personality: stability ↑ = more consistent, ↓ = more expressive
_AGENT_VOICES: dict[str, tuple[str, dict]] = {
    "mood": (
        config.ELEVENLABS_VOICE_MOOD,
        {"stability": 0.65, "similarity_boost": 0.80, "style": 0.30},  # measured/wise
    ),
    "dj": (
        config.ELEVENLABS_VOICE_DJ,
        {"stability": 0.30, "similarity_boost": 0.85, "style": 0.70},  # hype/varied
    ),
    "crowd": (
        config.ELEVENLABS_VOICE_CROWD,
        {"stability": 0.80, "similarity_boost": 0.75, "style": 0.10},  # robotic/flat
    ),
    "visual": (
        config.ELEVENLABS_VOICE_VISUAL,
        {"stability": 0.40, "similarity_boost": 0.80, "style": 0.60},  # dramatic/intense
    ),
    "social": (
        config.ELEVENLABS_VOICE_SOCIAL,
        {"stability": 0.35, "similarity_boost": 0.85, "style": 0.65},  # bubbly/excited
    ),
}


def _get_client():
    global _client
    if _client is not None:
        return _client
    if not config.ELEVENLABS_API_KEY:
        return None
    try:
        from elevenlabs import ElevenLabs
        _client = ElevenLabs(api_key=config.ELEVENLABS_API_KEY)
        print("[ELEVENLABS] Client initialized ✓")
        return _client
    except Exception as e:
        print(f"[ELEVENLABS WARNING] Could not initialize: {e}")
        return None


def _normalize_agent_name(agent_name: str) -> str:
    """Extract base agent key from names like 'MoodAgent', 'dj_agent', 'crowd'."""
    name = agent_name.lower().replace("agent", "").replace("_", "").strip()
    # Handle common aliases
    aliases = {"dj": "dj", "disc": "dj", "mood": "mood", "vibe": "mood",
               "crowd": "crowd", "energy": "crowd", "visual": "visual",
               "art": "visual", "social": "social", "hype": "social"}
    return aliases.get(name, name)


def speak(agent_name: str, text: str) -> Optional[bytes]:
    """
    Convert text to speech using eleven_v3 model with per-agent voices.
    Returns raw MP3 bytes, or None if TTS is unavailable.
    """
    client = _get_client()
    if not client:
        return None

    key = _normalize_agent_name(agent_name)
    if key in _AGENT_VOICES:
        voice_id, voice_settings = _AGENT_VOICES[key]
    else:
        voice_id = config.ELEVENLABS_DEFAULT_VOICE_ID
        voice_settings = {"stability": 0.5, "similarity_boost": 0.75}

    if not voice_id:
        print("[ELEVENLABS] No voice_id configured — skipping TTS")
        return None

    try:
        audio_generator = client.text_to_speech.convert(
            text=text,
            voice_id=voice_id,
            model_id=config.ELEVENLABS_MODEL_ID,
            voice_settings=voice_settings,
        )
        result = b"".join(audio_generator)
        print(f"[ELEVENLABS] TTS ok agent={agent_name} key={key} voice={voice_id[:8]}… bytes={len(result)}")
        return result
    except Exception as e:
        msg = str(e)
        if "402" in msg or "payment_required" in msg or "paid_plan" in msg:
            print("[ELEVENLABS] 402 — voice requires paid plan, falling back to browser TTS")
        elif "quota_exceeded" in msg or "401" in msg:
            print("[ELEVENLABS] Quota exhausted — falling back to browser TTS")
        else:
            print(f"[ELEVENLABS ERROR] agent={agent_name}: {e}")
        return None


def speak_negotiation(from_agent: str, line: str) -> Optional[bytes]:
    """Convenience wrapper for narrating agent negotiations."""
    return speak(from_agent.lower().replace("agent", "").strip(), line)
