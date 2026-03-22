"""
FastAPI application — WebSocket + REST bridge between fetch.ai agents and the frontend.
"""
import asyncio
import json
import re
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from api.routes import router
from api.websocket import manager, ws_broadcaster
from agents.mood_agent import event_queue, get_current_state
from agents.protocols import VIBE_PALETTES, VIBE_ANIMATION_STYLES
import agents.mood_agent as _mood_agent
from config import config


# ---------------------------------------------------------------------------
# Lifespan: start the WebSocket broadcaster background task
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start the broadcaster that drains the agent event queue → WebSocket clients
    task = asyncio.create_task(ws_broadcaster(event_queue))
    print("[VIBECHECK] WebSocket broadcaster started")
    yield
    task.cancel()
    print("[VIBECHECK] Shutting down")


app = FastAPI(
    title="VibeCheck API",
    description="Multi-agent event atmosphere engine — BeachHacks 9.0",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow Next.js dev server and production frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[config.FRONTEND_URL, "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# REST routes
app.include_router(router, prefix="/api")


# ---------------------------------------------------------------------------
# WebSocket endpoint
# ---------------------------------------------------------------------------
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    print(f"[WS] Client connected — total: {len(manager.active)}")
    try:
        while True:
            # Keep connection alive; frontend can send pings
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text('{"type":"pong"}')
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        print(f"[WS] Client disconnected — total: {len(manager.active)}")


# ---------------------------------------------------------------------------
# Gemini Live audio streaming endpoint
# ---------------------------------------------------------------------------
@app.websocket("/ws/audio-live")
async def audio_live_endpoint(websocket: WebSocket):
    """
    Receives raw 16kHz mono PCM chunks from the browser and streams them
    to the Gemini Live API for real-time crowd energy analysis.
    Sends back JSON energy events which the frontend uses to update the UI
    and which are also fed into CrowdAgent via the shared event_queue.
    """
    await websocket.accept()
    print("[GeminiLive] Client connected")
    try:
        from google import genai as _genai
        client = _genai.Client(api_key=config.GOOGLE_API_KEY)

        system_prompt = (
            "You are an audio energy analyzer for a live event. "
            "You receive short audio clips from a crowd microphone. "
            "For each clip, respond ONLY with a JSON object: "
            '{"energy": <0.0-1.0>, "mood": "<chill|building|peak|winding_down>", '
            '"description": "<one short sentence>"}. '
            "0.0 = completely silent, 1.0 = extremely loud/chaotic crowd. "
            "Be consistent and responsive to actual audio levels."
        )

        async with client.aio.live.connect(
            model="gemini-2.0-flash-live-001",
            config=_genai.types.LiveConnectConfig(
                response_modalities=["TEXT"],
                system_instruction=system_prompt,
            ),
        ) as session:
            print("[GeminiLive] Session open")

            async def receive_from_browser():
                """Forward PCM chunks from browser → Gemini Live."""
                try:
                    while True:
                        data = await websocket.receive_bytes()
                        await session.send_realtime_input(
                            audio=_genai.types.Blob(
                                data=data,
                                mime_type="audio/pcm;rate=16000",
                            )
                        )
                except WebSocketDisconnect:
                    pass

            async def receive_from_gemini():
                """Forward Gemini Live analysis → browser + event_queue."""
                try:
                    async for response in session.receive():
                        if response.text:
                            raw = response.text.strip()
                            # Parse JSON energy response
                            try:
                                # Strip markdown fences if present
                                clean = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw, flags=re.MULTILINE).strip()
                                parsed = json.loads(clean)
                                energy = float(parsed.get("energy", 0.5))
                                mood = parsed.get("mood", "chill")
                                description = parsed.get("description", "")

                                # Send to browser
                                await websocket.send_text(json.dumps({
                                    "type": "live_energy",
                                    "energy": energy,
                                    "mood": mood,
                                    "description": description,
                                }))

                                # Update server-side state with Gemini Live data
                                prev_mood = _mood_agent._state.get("mood", "chill")
                                _mood_agent._state["energy"] = energy
                                _mood_agent._state["mood"] = mood

                                # On mood change, trigger auto-play and negotiation drama
                                if mood != prev_mood:
                                    _mood_agent._prev_mood = prev_mood
                                    palette = VIBE_PALETTES.get(mood, VIBE_PALETTES["chill"])
                                    anim_style = VIBE_ANIMATION_STYLES.get(mood, "calm_flow")
                                    asyncio.create_task(_mood_agent._broadcast("visual", "VisualAgent", {
                                        "vibe_state": mood,
                                        "color_palette": palette,
                                        "animation_style": anim_style,
                                        "intensity": energy,
                                        "visual_comment": description,
                                    }))
                                    # Trigger negotiation drama
                                    neg = _mood_agent._TRANSITION_NEGOTIATIONS.get((prev_mood, mood))  # type: ignore[attr-defined]
                                    if neg:
                                        asyncio.create_task(_mood_agent._broadcast("negotiation", neg["from_agent"], {
                                            "from_agent": neg["from_agent"],
                                            "to_agent": neg["to_agent"],
                                            "proposal": neg["proposal"],
                                            "reasoning": neg["reasoning"],
                                            "agreed": neg["agreed"],
                                        }))
                                # Also update CrowdAgent's audio energy
                                try:
                                    from agents.crowd_agent import update_audio_energy
                                    update_audio_energy(energy)
                                except Exception:
                                    pass

                                # Push to frontend via event queue
                                try:
                                    event_queue.put_nowait({
                                        "event_type": "live_audio_energy",
                                        "agent": "GeminiLive",
                                        "timestamp": time.time(),
                                        "data": {
                                            "energy": energy,
                                            "mood": mood,
                                            "description": description,
                                        }
                                    })
                                except asyncio.QueueFull:
                                    pass

                                print(f"[GeminiLive] energy={energy:.2f} mood={mood}")
                            except (json.JSONDecodeError, ValueError):
                                pass  # Non-JSON output from Gemini — ignore
                except Exception as e:
                    print(f"[GeminiLive] Receive error: {e}")

            # Run both directions concurrently
            await asyncio.gather(receive_from_browser(), receive_from_gemini())

    except Exception as e:
        print(f"[GeminiLive] Session error: {e}")
        try:
            await websocket.send_text(json.dumps({"type": "error", "message": str(e)}))
        except Exception:
            pass
    finally:
        print("[GeminiLive] Client disconnected")
