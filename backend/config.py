import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    # Gemini
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")

    # Mistral (fallback LLM when Gemini quota exhausted)
    MISTRAL_API_KEY: str = os.getenv("MISTRAL_API_KEY", "")

    # ElevenLabs — eleven_v3 (paid tier) with distinct voices per agent
    ELEVENLABS_API_KEY: str = os.getenv("ELEVENLABS_API_KEY", "")
    ELEVENLABS_MODEL_ID: str = os.getenv("ELEVENLABS_MODEL_ID", "eleven_v3")

    # Per-agent voice IDs (all ElevenLabs premade voices, available on paid plans)
    # MoodAgent — Daniel: British, authoritative, wise philosopher vibes
    ELEVENLABS_VOICE_MOOD: str = os.getenv("ELEVENLABS_VOICE_MOOD", "onwK4e9ZLuTAKqWW03F9")
    # DJAgent — Sam: raspy American, high-energy hype machine
    ELEVENLABS_VOICE_DJ: str = os.getenv("ELEVENLABS_VOICE_DJ", "yoZ06aMxZJJ28mfd3POQ")
    # CrowdAgent — Arnold: deep American, robotic data-analyst energy
    ELEVENLABS_VOICE_CROWD: str = os.getenv("ELEVENLABS_VOICE_CROWD", "VR6AewLTigWG4xSOukaG")
    # VisualAgent — Callum: transatlantic, intense and dramatic
    ELEVENLABS_VOICE_VISUAL: str = os.getenv("ELEVENLABS_VOICE_VISUAL", "N2lVS1w4EtoT3dr4eOWO")
    # SocialAgent — Dorothy: British female, bubbly and excited
    ELEVENLABS_VOICE_SOCIAL: str = os.getenv("ELEVENLABS_VOICE_SOCIAL", "ThT5KcBeYPX3keUQqHPh")
    # Fallback default voice (Sarah)
    ELEVENLABS_DEFAULT_VOICE_ID: str = os.getenv("ELEVENLABS_DEFAULT_VOICE_ID", "EXAVITQu4vr4xnSDxMaL")

    # MongoDB
    MONGODB_URI: str = os.getenv("MONGODB_URI", "")

    # fetch.ai agent seeds
    AGENT_SEED_MOOD: str = os.getenv("FETCHAI_AGENT_SEED_MOOD", "mood_default_seed")
    AGENT_SEED_DJ: str = os.getenv("FETCHAI_AGENT_SEED_DJ", "dj_default_seed")
    AGENT_SEED_CROWD: str = os.getenv("FETCHAI_AGENT_SEED_CROWD", "crowd_default_seed")
    AGENT_SEED_VISUAL: str = os.getenv("FETCHAI_AGENT_SEED_VISUAL", "visual_default_seed")
    AGENT_SEED_SOCIAL: str = os.getenv("FETCHAI_AGENT_SEED_SOCIAL", "social_default_seed")

    # Server
    BACKEND_URL: str = os.getenv("BACKEND_URL", "http://localhost:8000")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")

    def validate(self):
        warnings = []
        if not self.GOOGLE_API_KEY:
            warnings.append("GOOGLE_API_KEY not set — Gemini calls will fail")
        if not self.ELEVENLABS_API_KEY:
            warnings.append("ELEVENLABS_API_KEY not set — TTS will be skipped")
        if not self.MONGODB_URI:
            warnings.append("MONGODB_URI not set — using in-memory fallback")
        for w in warnings:
            print(f"[CONFIG WARNING] {w}")
        return self


config = Config().validate()
