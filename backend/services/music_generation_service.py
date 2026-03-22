"""
Music generation via ElevenLabs Sound Effects API.
Generates loopable ambient/beat audio (up to 22s) based on mood + energy.
Falls back to None so the caller can switch to YouTube.
"""
import asyncio
from typing import Optional
import httpx
from config import config

# Mood → ElevenLabs sound-generation prompt
_MOOD_PROMPTS: dict[str, str] = {
    "peak": (
        "festival EDM drop, heavy 128bpm kick drums, supersaw synth leads, "
        "deep rolling bass, crowd hype build, no vocals, loud aggressive energy"
    ),
    "building": (
        "progressive house music, driving 116bpm kick, punchy snare, "
        "rising synth pads, energetic bass line, no vocals, anticipation build"
    ),
    "chill": (
        "lo-fi hip hop beats, soft vinyl crackle, gentle piano chords, "
        "brushed snare at 85bpm, warm bass, mellow relaxing, no vocals"
    ),
    "winding_down": (
        "ambient downtempo, slow 70bpm soft kick, dreamy pads, "
        "minimal melody, atmospheric drone, peaceful and sleepy, no vocals"
    ),
}

# Energy-based BPM range hint appended to prompt
_ENERGY_HINT: list[tuple[float, str]] = [
    (0.80, "high energy, maximum intensity"),
    (0.55, "medium energy, steady groove"),
    (0.30, "low energy, relaxed tempo"),
    (0.00, "very low energy, slow and dreamy"),
]


def _build_prompt(mood: str, energy: float, genre_hint: str = "") -> str:
    base = _MOOD_PROMPTS.get(mood, _MOOD_PROMPTS["chill"])
    energy_tag = next(tag for threshold, tag in _ENERGY_HINT if energy >= threshold)
    parts = [base, energy_tag]
    if genre_hint.strip():
        parts.append(genre_hint.strip())
    return ", ".join(parts)


async def generate_music(
    mood: str,
    energy: float,
    genre_hint: str = "",
    timeout_seconds: float = 12.0,
) -> Optional[bytes]:
    """
    Generate loopable background music using ElevenLabs Sound Generation API.
    Returns raw MP3 bytes, or None on failure / timeout / missing key.
    """
    if not config.ELEVENLABS_API_KEY:
        print("[MUSIC_GEN] No ElevenLabs API key — skipping generation")
        return None

    prompt = _build_prompt(mood, energy, genre_hint)
    print(f"[MUSIC_GEN] Generating: mood={mood} energy={energy:.2f} prompt='{prompt[:80]}…'")

    try:
        async with asyncio.timeout(timeout_seconds):
            async with httpx.AsyncClient(timeout=timeout_seconds) as client:
                resp = await client.post(
                    "https://api.elevenlabs.io/v1/sound-generation",
                    headers={
                        "xi-api-key": config.ELEVENLABS_API_KEY,
                        "Content-Type": "application/json",
                    },
                    json={
                        "text": prompt,
                        "duration_seconds": 22,
                        "prompt_influence": 0.35,
                    },
                )
                if resp.status_code == 200:
                    audio = resp.content
                    print(f"[MUSIC_GEN] Generated {len(audio)} bytes ✓")
                    return audio
                else:
                    print(f"[MUSIC_GEN] ElevenLabs {resp.status_code}: {resp.text[:120]}")
                    return None
    except asyncio.TimeoutError:
        print(f"[MUSIC_GEN] Timeout after {timeout_seconds}s — falling back to YouTube")
        return None
    except Exception as e:
        print(f"[MUSIC_GEN] Error: {e}")
        return None
