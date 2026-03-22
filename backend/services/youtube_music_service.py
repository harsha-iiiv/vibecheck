"""
YouTube Music search service using ytmusicapi (no API key required).
Searches for tracks and returns normalized metadata + YouTube video ID.
Used by DJAgent to enrich Gemini-selected tracks with real playback data.
"""
from ytmusicapi import YTMusic

_yt = YTMusic()


def search_track(query: str) -> dict | None:
    """
    Search YouTube Music for a track by name + artist.
    Returns normalized track info with YouTube video ID, or None on failure.
    """
    if not query:
        return None

    try:
        results = _yt.search(query, filter="songs", limit=1)
        if not results:
            print(f"[YTMusic] No results for '{query}'")
            return None

        song = results[0]
        video_id = song.get("videoId")
        if not video_id:
            return None

        # Prefer largest thumbnail
        thumbnails = song.get("thumbnails", [])
        thumb = thumbnails[-1].get("url") if thumbnails else None

        artists = [a["name"] for a in (song.get("artists") or []) if a.get("name")]

        result = {
            "youtube_id": video_id,
            "title": song.get("title", query),
            "artists": artists,
            "album": song.get("album", {}).get("name") if song.get("album") else None,
            "thumbnail_url": thumb,
        }
        print(f"[YTMusic] Found: '{result['title']}' by {artists} id={video_id}")
        return result

    except Exception as e:
        print(f"[YTMusic] Search failed for '{query}': {e}")
        return None


def get_related(video_id: str) -> list[dict]:
    """
    Fetch related tracks for auto-queue. Returns up to 5 normalized items.
    """
    if not video_id:
        return []

    try:
        radio = _yt.get_watch_playlist(videoId=video_id, limit=6)
        tracks = radio.get("tracks", [])[1:6]  # skip the current track
        related = []
        for t in tracks:
            vid = t.get("videoId")
            if not vid:
                continue
            related.append({
                "youtube_id": vid,
                "title": t.get("title", ""),
                "artists": [a["name"] for a in (t.get("artists") or []) if a.get("name")],
            })
        return related

    except Exception as e:
        print(f"[YTMusic] Related failed for id={video_id}: {e}")
        return []
