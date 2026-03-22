"""
VibeCheck entry point.
Starts the fetch.ai Bureau (all 5 agents in one process) + FastAPI server.

Run with: .venv/bin/python run.py
"""
import asyncio
import threading
import uvicorn
from uagents import Bureau

from agents.mood_agent import mood_agent, register_agent_address
from agents.crowd_agent import crowd_agent, set_mood_agent_address as crowd_set_mood
from agents.dj_agent import dj_agent, set_mood_agent_address as dj_set_mood
from agents.visual_agent import visual_agent, set_mood_agent_address as visual_set_mood
from agents.social_agent import social_agent, set_mood_agent_address as social_set_mood


def start_bureau():
    """Run the fetch.ai Bureau in a dedicated thread."""
    # Python 3.10+ threads have no event loop by default — create one explicitly
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    bureau = Bureau(port=8100)
    bureau.add(mood_agent)
    bureau.add(crowd_agent)
    bureau.add(dj_agent)
    bureau.add(visual_agent)
    bureau.add(social_agent)

    # Wire agent addresses so they can message each other
    mood_addr = mood_agent.address
    crowd_set_mood(mood_addr)
    dj_set_mood(mood_addr)
    visual_set_mood(mood_addr)
    social_set_mood(mood_addr)

    register_agent_address("crowd", crowd_agent.address)
    register_agent_address("dj", dj_agent.address)
    register_agent_address("visual", visual_agent.address)
    register_agent_address("social", social_agent.address)

    print(f"[BUREAU] MoodAgent:   {mood_addr}")
    print(f"[BUREAU] CrowdAgent:  {crowd_agent.address}")
    print(f"[BUREAU] DJAgent:     {dj_agent.address}")
    print(f"[BUREAU] VisualAgent: {visual_agent.address}")
    print(f"[BUREAU] SocialAgent: {social_agent.address}")
    print("[BUREAU] All 5 agents registered. Starting...")

    bureau.run()


def main():
    print("""
 __   _____ ___ ___ ___ _  _ ___ ___ _  __
 \\ \\ / /_ _| _ ) __/ __| || | __/ __| |/ /
  \\ V / | || _ \\ _| (__| __ | _| (__| ' <
   \\_/ |___|___/___\\___|_||_|___\\___|_|\\_\\

  BeachHacks 9.0 — Multi-Agent Event Atmosphere Engine
  """)

    # Bureau runs in a daemon thread (blocking sync)
    bureau_thread = threading.Thread(target=start_bureau, daemon=True)
    bureau_thread.start()

    # FastAPI + uvicorn on main thread (async)
    uvicorn.run(
        "api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info",
    )


if __name__ == "__main__":
    main()
