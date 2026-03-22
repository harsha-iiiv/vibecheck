"""
WebSocket connection manager — broadcasts agent events to all connected frontend clients.
Reads from the shared asyncio.Queue populated by mood_agent.py.
"""
import asyncio
import json
from fastapi import WebSocket, WebSocketDisconnect


class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self, data: dict):
        message = json.dumps(data)
        dead = []
        for ws in self.active:
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


manager = ConnectionManager()


async def ws_broadcaster(event_queue: asyncio.Queue):
    """
    Background task: drain the event queue and broadcast to all WebSocket clients.
    Run this with asyncio.create_task() from the FastAPI lifespan.
    """
    while True:
        try:
            event = await asyncio.wait_for(event_queue.get(), timeout=1.0)
            await manager.broadcast(event)
        except asyncio.TimeoutError:
            continue
        except Exception as e:
            print(f"[WS BROADCASTER ERROR] {e}")
