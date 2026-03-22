"""
MongoDB Atlas service — persists vibe history, agent negotiations, sessions.
Falls back to in-memory dicts if MONGODB_URI is not set (hackathon safety net).
"""
import time
from typing import Optional
from config import config

_client = None
_db = None
_in_memory: dict = {
    "sessions": [],
    "vibe_history": [],
    "agent_negotiations": [],
    "music_history": [],
    "social_prompts": [],
}


def _get_db():
    global _client, _db
    if _db is not None:
        return _db
    if not config.MONGODB_URI:
        return None
    try:
        from pymongo import MongoClient
        _client = MongoClient(config.MONGODB_URI, serverSelectionTimeoutMS=3000)
        _client.admin.command("ping")  # Verify connection
        _db = _client.vibecheck
        print("[MONGODB] Connected to Atlas ✓")
        return _db
    except Exception as e:
        print(f"[MONGODB WARNING] Could not connect: {e} — using in-memory fallback")
        return None


# ---------------------------------------------------------------------------
# Sessions
# ---------------------------------------------------------------------------

def create_session(session_id: str, settings: dict = {}) -> dict:
    doc = {"session_id": session_id, "started_at": time.time(), "settings": settings}
    db = _get_db()
    if db is not None:
        db.sessions.insert_one(doc)
    else:
        _in_memory["sessions"].append(doc)
    return doc


def get_session(session_id: str) -> Optional[dict]:
    db = _get_db()
    if db is not None:
        return db.sessions.find_one({"session_id": session_id}, {"_id": 0})
    return next((s for s in _in_memory["sessions"] if s["session_id"] == session_id), None)


# ---------------------------------------------------------------------------
# Vibe history (time-series)
# ---------------------------------------------------------------------------

def log_vibe(session_id: str, energy: float, mood: str):
    doc = {"session_id": session_id, "energy": energy, "mood": mood, "timestamp": time.time()}
    db = _get_db()
    if db is not None:
        db.vibe_history.insert_one(doc)
    else:
        _in_memory["vibe_history"].append(doc)
        # Cap in-memory history at 500 entries
        if len(_in_memory["vibe_history"]) > 500:
            _in_memory["vibe_history"] = _in_memory["vibe_history"][-500:]


def get_vibe_history(session_id: str, limit: int = 50) -> list:
    db = _get_db()
    if db is not None:
        cursor = db.vibe_history.find(
            {"session_id": session_id}, {"_id": 0}
        ).sort("timestamp", -1).limit(limit)
        return list(cursor)
    return [v for v in _in_memory["vibe_history"] if v["session_id"] == session_id][-limit:]


# ---------------------------------------------------------------------------
# Agent negotiations
# ---------------------------------------------------------------------------

def log_negotiation(session_id: str, from_agent: str, to_agent: str,
                     proposal: str, reasoning: str, agreed: bool):
    doc = {
        "session_id": session_id,
        "from_agent": from_agent,
        "to_agent": to_agent,
        "proposal": proposal,
        "reasoning": reasoning,
        "agreed": agreed,
        "timestamp": time.time(),
    }
    db = _get_db()
    if db is not None:
        db.agent_negotiations.insert_one(doc)
    else:
        _in_memory["agent_negotiations"].append(doc)
        if len(_in_memory["agent_negotiations"]) > 200:
            _in_memory["agent_negotiations"] = _in_memory["agent_negotiations"][-200:]


def get_negotiations(session_id: str, limit: int = 20) -> list:
    db = _get_db()
    if db is not None:
        cursor = db.agent_negotiations.find(
            {"session_id": session_id}, {"_id": 0}
        ).sort("timestamp", -1).limit(limit)
        return list(cursor)
    return [n for n in _in_memory["agent_negotiations"] if n["session_id"] == session_id][-limit:]


# ---------------------------------------------------------------------------
# Music history
# ---------------------------------------------------------------------------

def log_music(session_id: str, track_name: str, artist: str,
               bpm: int, energy_level: float, requested_by: str):
    doc = {
        "session_id": session_id,
        "track_name": track_name,
        "artist": artist,
        "bpm": bpm,
        "energy_level": energy_level,
        "requested_by": requested_by,
        "timestamp": time.time(),
    }
    db = _get_db()
    if db is not None:
        db.music_history.insert_one(doc)
    else:
        _in_memory["music_history"].append(doc)


# ---------------------------------------------------------------------------
# Social prompts
# ---------------------------------------------------------------------------

def log_social_prompt(session_id: str, prompt_type: str, content: str, energy_match: float):
    doc = {
        "session_id": session_id,
        "prompt_type": prompt_type,
        "content": content,
        "energy_match": energy_match,
        "timestamp": time.time(),
    }
    db = _get_db()
    if db is not None:
        db.social_prompts.insert_one(doc)
    else:
        _in_memory["social_prompts"].append(doc)


def get_in_memory_stats() -> dict:
    """Debug endpoint — returns in-memory collection sizes."""
    return {k: len(v) for k, v in _in_memory.items()}
