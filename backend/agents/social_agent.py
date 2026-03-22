"""
SocialAgent — overly enthusiastic party host.
Receives SocialPrompt requests from MoodAgent, generates icebreakers via Gemini,
broadcasts them to the frontend.
"""
from uagents import Agent, Context

from agents.protocols import SocialPrompt, AgentNegotiation
from agents.mood_agent import _broadcast
from services import gemini_service
from config import config

_mood_agent_address: str = ""

def set_mood_agent_address(addr: str):
    global _mood_agent_address
    _mood_agent_address = addr


social_agent = Agent(
    name="SocialAgent",
    seed=config.AGENT_SEED_SOCIAL,
    port=8005,
    endpoint=["http://localhost:8005/submit"],
)


@social_agent.on_message(model=SocialPrompt)
async def handle_social_prompt(ctx: Context, sender: str, msg: SocialPrompt):
    ctx.logger.info(
        f"[SocialAgent] Generating {msg.prompt_type} for energy={msg.energy_match:.2f}"
    )

    result = gemini_service.generate_icebreaker(msg.energy_match)
    content = result.get("content", msg.content or "Find someone you haven't met and swap project ideas!")
    social_comment = result.get("social_comment", "LET'S GOOO! 🎉")
    prompt_type = result.get("prompt_type", msg.prompt_type)

    await _broadcast("social", "SocialAgent", {
        "prompt_type": prompt_type,
        "content": content,
        "social_comment": social_comment,
        "energy_match": msg.energy_match,
    })

    ctx.logger.info(f"[SocialAgent] '{social_comment}' → {content[:60]}...")

    # Send response back to MoodAgent so it can update state
    if sender:
        await ctx.send(
            sender,
            SocialPrompt(
                prompt_type=prompt_type,
                content=content,
                energy_match=msg.energy_match,
            ),
        )


@social_agent.on_message(model=AgentNegotiation)
async def handle_negotiation(ctx: Context, sender: str, msg: AgentNegotiation):
    ctx.logger.info(f"[SocialAgent] Got note from {msg.from_agent}: {msg.proposal}")
