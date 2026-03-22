"""
ElevenLabs TTS service — each agent has a unique voice.
Falls back to None (no audio) if API key or voice IDs are not set.
"""
import io
from typing import Optional
from config import config

# Lazy client init
_client = None


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


def speak(agent_name: str, text: str) -> Optional[bytes]:
    """
    Convert text to speech using the agent's assigned voice.
    Returns raw MP3 bytes, or None if TTS is unavailable.

    agent_name: "mood" | "dj" | "crowd" | "visual" | "social"
    """
    client = _get_client()
    if not client:
        return None

    voice_id = config.ELEVENLABS_VOICE_IDS.get(agent_name.lower(), "")
    if not voice_id:
        print(f"[ELEVENLABS] No voice_id configured for agent '{agent_name}' — skipping TTS")
        return None

    try:
        audio_generator = client.text_to_speech.convert(
            text=text,
            voice_id=voice_id,
            model_id="eleven_turbo_v2_5",
        )
        # Generator → bytes
        result = b"".join(audio_generator)
        print(f"[ELEVENLABS] TTS ok agent={agent_name} bytes={len(result)}")
        return result
    except Exception as e:
        import traceback
        print(f"[ELEVENLABS ERROR] agent={agent_name} voice_id={voice_id}: {e}")
        traceback.print_exc()
        return None


def speak_negotiation(from_agent: str, line: str) -> Optional[bytes]:
    """Convenience wrapper for narrating agent negotiations."""
    return speak(from_agent.lower().replace("agent", "").strip(), line)


# Agent voice personality notes (for reference when assigning voice IDs in .env):
# MoodAgent  → calm, deep, wise (e.g. ElevenLabs "George" or "Daniel")
# DJAgent    → energetic, fast-talking (e.g. "Charlie" or "Harry")
# CrowdAgent → robotic, precise (e.g. "Arnold" or a cloned robotic voice)
# VisualAgent → dreamy, dramatic (e.g. "Matilda" or "Sarah")
# SocialAgent → bubbly, enthusiastic (e.g. "Alice" or "Lily")
VOICE_PERSONALITY_NOTES = {
    "mood":   "Calm, deep, wise — like Morgan Freeman. ElevenLabs: 'George' or 'Daniel'",
    "dj":     "Energetic, fast-talking radio host. ElevenLabs: 'Charlie' or 'Harry'",
    "crowd":  "Robotic, precise, analytical. ElevenLabs: 'Arnold' or custom clone",
    "visual": "Dreamy, dramatic, artistic. ElevenLabs: 'Matilda' or 'Sarah'",
    "social": "Bubbly, enthusiastic party host. ElevenLabs: 'Alice' or 'Lily'",
}
