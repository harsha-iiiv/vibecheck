"""
FastAPI application — WebSocket + REST bridge between fetch.ai agents and the frontend.
"""
import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from api.routes import router
from api.websocket import manager, ws_broadcaster
from agents.mood_agent import event_queue
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
