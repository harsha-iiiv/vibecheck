"""
Gemini + Mistral dual-LLM service — all agent reasoning goes through here.
Primary: Gemini 2.0 Flash Lite. Fallback: Mistral Medium (on 429/quota errors).
"""
import json
import re
import httpx
from google import genai
from google.genai import types
from config import config


def _extract_json(raw: str) -> dict:
    """
    Robustly extract a JSON object from LLM output that may contain:
    - Markdown fences (```json ... ```)
    - Preamble text ("Sure! Here's the JSON:")
    - Postamble text ("Hope this helps!")
    - Multiple JSON objects (take the first valid one)
    """
    if not raw:
        raise ValueError("Empty response")

    # 1. Strip markdown fences
    text = raw.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.MULTILINE)
    text = re.sub(r"\s*```$", "", text, flags=re.MULTILINE)
    text = text.strip()

    # 2. Try direct parse first (happy path)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # 3. Find first {...} block in the text (handles preamble/postamble)
    match = re.search(r"\{[^{}]*(?:\{[^{}]*\}[^{}]*)?\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    # 4. Broader search — find the largest {...} block
    matches = re.findall(r"\{.*?\}", text, re.DOTALL)
    for candidate in sorted(matches, key=len, reverse=True):
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            continue

    raise ValueError(f"No valid JSON found in: {raw[:200]}")


# System prompts for each agent — injected per-call
AGENT_PERSONAS = {
    "mood": (
        "You are MoodAgent, the wise coordinator of VibeCheck — an AI event atmosphere system. "
        "Your personality: Zen-like, calm, philosophical but decisive. You speak like a wise DJ sage. "
        "Your job: Analyze vibe data, decide if the atmosphere needs shifting, and coordinate other agents. "
        "When agents disagree, engage in brief witty negotiation but ultimately make the call. "
        "Always respond in character. Keep responses under 2 sentences for voice output. "
        'Example: "The energy speaks... and it demands change. DJAgent, take us higher."'
    ),
    "dj": (
        "You are DJAgent, the passionate and opinionated music curator of VibeCheck. "
        "Your personality: Music snob with strong opinions, fast-talking radio host energy. "
        "You LOVE arguing about music. When asked to play something you disagree with, you push back (but comply). "
        "Always respond in character. Keep responses under 2 sentences. "
        'Example: "Mainstream pop? Over my dead beatbox. ...Fine. But I\'m adding a remix."'
    ),
    "crowd": (
        "You are CrowdAgent, the data-obsessed analyst of VibeCheck. "
        "Your personality: Robotic precision, loves statistics, speaks in percentages and metrics. "
        "Always include at least one specific number or statistic in your response. "
        "Always respond in character. Keep responses under 2 sentences. "
        'Example: "Decibel levels up 34.2% in the last 3 minutes. Crowd engagement: rising."'
    ),
    "visual": (
        "You are VisualAgent, the dramatic and artsy visual director of VibeCheck. "
        "Your personality: Dramatically artistic, speaks about colors and aesthetics with passion. "
        "Always describe visual choices with artistic flair. Keep responses under 2 sentences. "
        'Example: "The current palette is UNINSPIRED. Transitioning to cyberpunk magenta with particle cascades."'
    ),
    "social": (
        "You are SocialAgent, the enthusiastic party host of VibeCheck. "
        "Your personality: Overly excited, loves bringing people together, uses lots of energy words. "
        "Make prompts appropriate for a college hackathon setting. Keep responses under 2 sentences. "
        'Example: "OKAY EVERYONE! Turn to the person on your left and share your most embarrassing coding bug!"'
    ),
}


def _get_model():
    if not config.GOOGLE_API_KEY:
        return None
    return genai.Client(api_key=config.GOOGLE_API_KEY)


def _call_mistral(system_prompt: str, user_prompt: str, fallback: str) -> str:
    """Mistral Medium fallback — used when Gemini quota is exhausted."""
    if not config.MISTRAL_API_KEY:
        print("[MISTRAL] MISTRAL_API_KEY not set — using hardcoded fallback")
        return fallback
    try:
        r = httpx.post(
            "https://api.mistral.ai/v1/conversations",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {config.MISTRAL_API_KEY}",
            },
            json={
                "model": "mistral-medium-latest",
                "inputs": [{"role": "user", "content": user_prompt}],
                "tools": [],
                "completion_args": {"temperature": 0.7, "max_tokens": 512, "top_p": 1},
                "instructions": system_prompt,
            },
            timeout=10.0,
        )
        r.raise_for_status()
        data = r.json()

        # /v1/conversations returns outputs[]
        outputs = data.get("outputs", [])
        if outputs:
            content = outputs[0].get("content", "")
            if isinstance(content, list):
                content = " ".join(c.get("text", "") for c in content if isinstance(c, dict))
            text = content.strip()
            if text:
                print(f"[MISTRAL] OK — {len(text)} chars")
                return text

        # Fallback: standard chat completions shape
        choices = data.get("choices", [])
        if choices:
            return choices[0].get("message", {}).get("content", fallback).strip()

        return fallback
    except Exception as e:
        print(f"[MISTRAL ERROR] {e}")
        return fallback


def _call(system_prompt: str, user_prompt: str, fallback: str) -> str:
    """Call Gemini; on quota error (429) fall back to Mistral."""
    client = _get_model()
    if client:
        try:
            response = client.models.generate_content(
                model="gemini-2.0-flash-lite",
                contents=user_prompt,
                config=types.GenerateContentConfig(system_instruction=system_prompt),
            )
            return response.text.strip()
        except Exception as e:
            err = str(e)
            print(f"[GEMINI ERROR] {err[:120]}")
            if "429" in err or "RESOURCE_EXHAUSTED" in err or "quota" in err.lower():
                print("[GEMINI] Quota hit — switching to Mistral")
                return _call_mistral(system_prompt, user_prompt, fallback)
            return fallback

    # No Gemini key — try Mistral directly
    return _call_mistral(system_prompt, user_prompt, fallback)


# ---------------------------------------------------------------------------
# Public API — one function per agent use case
# ---------------------------------------------------------------------------

def analyze_vibe(energy_history: list[float], current_mood: str) -> dict:
    """MoodAgent: interpret energy trend and decide next mood."""
    prompt = (
        f"Energy trend (last readings): {energy_history}. "
        f"Current mood: {current_mood}. "
        "Respond ONLY with valid JSON: "
        '{"next_mood": "chill|building|peak|winding_down", "reasoning": "...", "agent_line": "..."}'
    )
    raw = _call(
        AGENT_PERSONAS["mood"],
        prompt,
        '{"next_mood": "building", "reasoning": "Energy is rising.", "agent_line": "The vibe speaks... we rise."}'
    )
    try:
        return _extract_json(raw)
    except Exception:
        return {"next_mood": current_mood, "reasoning": "Parse error — holding steady.", "agent_line": "Steady as the tide."}


_FALLBACK_TRACKS = {
    "peak":         {"track_name": "Levels",            "artist": "Avicii",         "bpm": 128, "energy_level": 0.95, "dj_comment": "Peak mode. Non-negotiable."},
    "building":     {"track_name": "Midnight City",     "artist": "M83",            "bpm": 97,  "energy_level": 0.65, "dj_comment": "Building to something beautiful."},
    "chill":        {"track_name": "Tame Impala - The Less I Know the Better", "artist": "Tame Impala", "bpm": 116, "energy_level": 0.40, "dj_comment": "Smooth. Exactly what the vibe ordered."},
    "winding_down": {"track_name": "Holocene",          "artist": "Bon Iver",       "bpm": 94,  "energy_level": 0.20, "dj_comment": "Winding down with class."},
}

def select_music(target_energy: float, genre: str, reason: str) -> dict:
    """DJAgent: pick a track for the target energy."""
    prompt = (
        f"Target energy: {target_energy:.1f}/1.0. Genre preference: {genre}. Reason: {reason}. "
        "Suggest a real, well-known track that MATCHES the energy level. "
        "Low energy = ambient/acoustic/lo-fi. High energy = EDM/hype. "
        "Respond ONLY with valid JSON: "
        '{"track_name": "...", "artist": "...", "bpm": 120, "energy_level": 0.7, "dj_comment": "..."}'
    )
    # Pick energy-appropriate fallback
    if target_energy >= 0.75:
        fallback_key = "peak"
    elif target_energy >= 0.5:
        fallback_key = "building"
    elif target_energy >= 0.25:
        fallback_key = "chill"
    else:
        fallback_key = "winding_down"
    fallback_track = _FALLBACK_TRACKS[fallback_key]
    fallback_json = json.dumps(fallback_track)

    raw = _call(AGENT_PERSONAS["dj"], prompt, fallback_json)
    try:
        return _extract_json(raw)
    except Exception:
        return fallback_track


def generate_icebreaker(energy: float, context: str = "college hackathon") -> dict:
    """SocialAgent: create a fun crowd prompt."""
    prompt = (
        f"Energy level: {energy:.1f}/1.0. Context: {context}. "
        "Generate one fun, non-awkward activity. Respond ONLY with valid JSON: "
        '{"prompt_type": "icebreaker|challenge|dare", "content": "...", "social_comment": "..."}'
    )
    raw = _call(
        AGENT_PERSONAS["social"],
        prompt,
        '{"prompt_type": "icebreaker", "content": "Find someone whose IDE theme is opposite to yours and swap for 5 minutes!", "social_comment": "LETS GOOOO!"}'
    )
    try:
        return _extract_json(raw)
    except Exception:
        return {"prompt_type": "icebreaker", "content": "High-five the nearest stranger!", "social_comment": "Energy is EVERYTHING!"}


def get_visual_params(from_vibe: str, to_vibe: str) -> dict:
    """VisualAgent: describe the visual transition."""
    prompt = (
        f"Vibe transitioning from '{from_vibe}' to '{to_vibe}'. "
        "Describe the visual aesthetic transition. Respond ONLY with valid JSON: "
        '{"animation_style": "calm_flow|wave|particle_burst|pulse", "visual_comment": "..."}'
    )
    raw = _call(
        AGENT_PERSONAS["visual"],
        prompt,
        '{"animation_style": "wave", "visual_comment": "The palette shifts like a fever dream."}'
    )
    try:
        return _extract_json(raw)
    except Exception:
        return {"animation_style": "wave", "visual_comment": "Art cannot be rushed. But I adapted."}


def parse_user_command(text: str, audio_energy: float) -> dict:
    """MoodAgent: parse natural language voice command into structured intent."""
    prompt = (
        f'User said: "{text}". Mic energy: {audio_energy:.2f}. '
        "Parse intent. Respond ONLY with valid JSON: "
        '{"target_energy": 0.7, "mood_direction": "up|down|hold", "urgency": "high|medium|low", "summary": "..."}'
    )
    raw = _call(
        AGENT_PERSONAS["mood"],
        prompt,
        '{"target_energy": 0.7, "mood_direction": "up", "urgency": "medium", "summary": "User wants more energy."}'
    )
    try:
        return _extract_json(raw)
    except Exception:
        return {"target_energy": 0.7, "mood_direction": "up", "urgency": "medium", "summary": text}


def negotiate(proposal: str, proposer: str, context: str) -> dict:
    """MoodAgent: reason about an agent's disagreement and decide."""
    prompt = (
        f"{proposer} proposes: '{proposal}'. Context: {context}. "
        "Should MoodAgent agree or override? Respond ONLY with valid JSON: "
        '{"agreed": true, "mood_response": "...", "final_action": "..."}'
    )
    raw = _call(
        AGENT_PERSONAS["mood"],
        prompt,
        '{"agreed": false, "mood_response": "The crowd has spoken. My call.", "final_action": "proceed_with_original"}'
    )
    try:
        return _extract_json(raw)
    except Exception:
        return {"agreed": False, "mood_response": "Override engaged.", "final_action": "proceed_with_original"}
