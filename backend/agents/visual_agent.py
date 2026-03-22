"""
VisualAgent — dramatic, artsy visual director.
Receives VisualUpdate from MoodAgent, enriches with Gemini commentary,
broadcasts final canvas parameters to frontend via event_queue.
"""
from uagents import Agent, Context

from agents.protocols import VisualUpdate, AgentNegotiation, VIBE_PALETTES, VIBE_ANIMATION_STYLES
from agents.mood_agent import _broadcast
from services import gemini_service
from config import config

_mood_agent_address: str = ""

def set_mood_agent_address(addr: str):
    global _mood_agent_address
    _mood_agent_address = addr


visual_agent = Agent(
    name="VisualAgent",
    seed=config.AGENT_SEED_VISUAL,
    port=8004,
    endpoint=["http://localhost:8004/submit"],
)


@visual_agent.on_message(model=VisualUpdate)
async def handle_visual_update(ctx: Context, sender: str, msg: VisualUpdate):
    ctx.logger.info(
        f"[VisualAgent] Update: vibe={msg.vibe_state} style={msg.animation_style} intensity={msg.intensity:.2f}"
    )

    # Ask Gemini for the artistic take on this transition
    result = gemini_service.get_visual_params("previous", msg.vibe_state)
    visual_comment = result.get("visual_comment", "The canvas breathes with new purpose.")
    refined_style = result.get("animation_style", msg.animation_style)

    # Broadcast enriched visual params to frontend
    await _broadcast("visual", "VisualAgent", {
        "vibe_state": msg.vibe_state,
        "color_palette": msg.color_palette or VIBE_PALETTES.get(msg.vibe_state, VIBE_PALETTES["chill"]),
        "animation_style": refined_style,
        "intensity": msg.intensity,
        "visual_comment": visual_comment,
    })

    ctx.logger.info(f"[VisualAgent] '{visual_comment}'")


@visual_agent.on_message(model=AgentNegotiation)
async def handle_negotiation(ctx: Context, sender: str, msg: AgentNegotiation):
    ctx.logger.info(f"[VisualAgent] Noted: {msg.proposal}")
