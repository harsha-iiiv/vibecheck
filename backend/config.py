import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    # Gemini
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")

    # Mistral (fallback LLM when Gemini quota exhausted)
    MISTRAL_API_KEY: str = os.getenv("MISTRAL_API_KEY", "")

    # ElevenLabs
    ELEVENLABS_API_KEY: str = os.getenv("ELEVENLABS_API_KEY", "")
    ELEVENLABS_VOICE_IDS: dict = {
        "mood": os.getenv("ELEVENLABS_MOOD_VOICE_ID", ""),
        "dj": os.getenv("ELEVENLABS_DJ_VOICE_ID", ""),
        "crowd": os.getenv("ELEVENLABS_CROWD_VOICE_ID", ""),
        "visual": os.getenv("ELEVENLABS_VISUAL_VOICE_ID", ""),
        "social": os.getenv("ELEVENLABS_SOCIAL_VOICE_ID", ""),
    }

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
