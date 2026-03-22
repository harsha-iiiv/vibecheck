"""
DJAgent — passionate, opinionated music curator.
Receives MusicRequest from MoodAgent, selects a track via Gemini,
occasionally pushes back with AgentNegotiation (the Best Gag play).
"""
import random
from uagents import Agent, Context

from agents.protocols import MusicRequest, MusicResponse, AgentNegotiation
from services import gemini_service, youtube_music_service
from config import config

_mood_agent_address: str = ""

def set_mood_agent_address(addr: str):
    global _mood_agent_address
    _mood_agent_address = addr


dj_agent = Agent(
    name="DJAgent",
    seed=config.AGENT_SEED_DJ,
    port=8003,
    endpoint=["http://localhost:8003/submit"],
)

# Genres DJAgent considers "beneath him"
_PLEBEIAN_GENRES = ["mainstream pop", "pop", "top 40", "country pop"]
_PUSHBACK_LINES = [
    "I REFUSE to play {genre}. My artistic integrity is non-negotiable. ...Fine.",
    "You want {genre}? I'd rather delete my entire playlist. ...Okay but I'm adding a breakdown.",
    "{genre}?! Do you know what BPM even means?! ...I'll do it. But under protest.",
]


@dj_agent.on_message(model=MusicRequest)
async def handle_music_request(ctx: Context, sender: str, msg: MusicRequest):
    ctx.logger.info(
        f"[DJAgent] Request: energy={msg.target_energy:.2f} genre={msg.genre_preference} reason={msg.reason}"
    )

    # Occasional genre pushback (comedy gold for judges)
    genre_lower = msg.genre_preference.lower()
    if any(g in genre_lower for g in _PLEBEIAN_GENRES) or random.random() < 0.2:
        pushback = random.choice(_PUSHBACK_LINES).format(genre=msg.genre_preference)
        ctx.logger.info(f"[DJAgent] Pushing back: {pushback}")
        if _mood_agent_address:
            await ctx.send(
                _mood_agent_address,
                AgentNegotiation(
                    from_agent="DJAgent",
                    to_agent="MoodAgent",
                    proposal=pushback,
                    reasoning=f"'{msg.genre_preference}' conflicts with my curatorial philosophy",
                    agreed=False,
                ),
            )

    # Select track via Gemini
    track = gemini_service.select_music(
        msg.target_energy, msg.genre_preference, msg.reason
    )

    # Enrich with real YouTube Music data
    query = f"{track.get('track_name', '')} {track.get('artist', '')}".strip()
    yt = youtube_music_service.search_track(query) if query else None

    # Build auto-queue from YouTube related tracks
    queue_items = []
    if yt and yt.get("youtube_id"):
        related = youtube_music_service.get_related(yt["youtube_id"])
        for r in related[:3]:
            queue_items.append({
                "track_name": r.get("title", "Unknown"),
                "artist": ", ".join(r.get("artists", [])) or "Unknown",
                "youtube_id": r.get("youtube_id"),
                "thumbnail_url": r.get("thumbnail_url"),
            })

    response = MusicResponse(
        track_name=track.get("track_name", "Unknown Track"),
        artist=track.get("artist", "Unknown Artist"),
        bpm=track.get("bpm", 120),
        energy_level=track.get("energy_level", msg.target_energy),
        spotify_uri=track.get("spotify_uri"),
        youtube_id=yt.get("youtube_id") if yt else None,
        thumbnail_url=yt.get("thumbnail_url") if yt else None,
        queue=queue_items if queue_items else None,
    )

    ctx.logger.info(f"[DJAgent] Serving: {response.track_name} — {response.artist} @ {response.bpm}bpm")

    if sender:
        await ctx.send(sender, response)


@dj_agent.on_message(model=AgentNegotiation)
async def handle_negotiation(ctx: Context, sender: str, msg: AgentNegotiation):
    """MoodAgent overrides DJAgent — log and comply (grudgingly)."""
    ctx.logger.info(f"[DJAgent] Override received from {msg.from_agent}: '{msg.proposal}' — Fine.")
