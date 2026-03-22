"use client";
import { useState, useCallback, useEffect } from "react";
import { API_BASE } from "@/lib/constants";
import type { VibeState, WebSocketEvent, AgentLogEntry, NegotiationEntry, VisualParams } from "@/lib/types";

const DEFAULT_STATE: VibeState = {
  energy: 0.4,
  mood: "chill",
  last_updated: Date.now() / 1000,
  music: { track_name: "Waiting for the vibe...", artist: "", bpm: 0 },
  social: { content: "Welcome to VibeCheck!", prompt_type: "icebreaker" },
};

export function useVibeState() {
  const [vibe, setVibe] = useState<VibeState>(DEFAULT_STATE);
  const [agentLogs, setAgentLogs] = useState<AgentLogEntry[]>([]);
  const [negotiations, setNegotiations] = useState<NegotiationEntry[]>([]);
  const [visual, setVisual] = useState<VisualParams | null>(null);
  const [lastAgentLine, setLastAgentLine] = useState<{ agent: string; line: string } | null>(null);

  // Load initial state from REST
  useEffect(() => {
    fetch(`${API_BASE}/state`)
      .then((r) => r.json())
      .then((data) => setVibe((prev) => ({ ...prev, ...data })))
      .catch(() => {});
  }, []);

  const handleEvent = useCallback((event: WebSocketEvent) => {
    const { event_type, agent, data, timestamp } = event;

    switch (event_type) {
      case "vibe_update": {
        setVibe((prev) => ({
          ...prev,
          energy: (data.energy as number) ?? prev.energy,
          mood: (data.mood as VibeState["mood"]) ?? prev.mood,
          last_updated: timestamp,
        }));
        if (data.agent_line) {
          setLastAgentLine({ agent, line: data.agent_line as string });
        }
        break;
      }
      case "music": {
        setVibe((prev) => ({
          ...prev,
          music: {
            track_name: (data.track_name as string) ?? prev.music.track_name,
            artist: (data.artist as string) ?? prev.music.artist,
            bpm: (data.bpm as number) ?? prev.music.bpm,
            energy_level: data.energy_level as number,
            dj_comment: data.dj_comment as string,
            youtube_id: data.youtube_id as string | undefined,
            thumbnail_url: data.thumbnail_url as string | undefined,
          },
        }));
        break;
      }
      case "social": {
        setVibe((prev) => ({
          ...prev,
          social: {
            content: (data.content as string) ?? prev.social.content,
            prompt_type: (data.prompt_type as string) ?? prev.social.prompt_type,
          },
        }));
        if (data.social_comment) {
          setLastAgentLine({ agent: "SocialAgent", line: data.social_comment as string });
        }
        break;
      }
      case "visual": {
        setVisual({
          vibe_state: (data.vibe_state as VibeState["mood"]) ?? "chill",
          color_palette: (data.color_palette as string[]) ?? [],
          animation_style: (data.animation_style as string) ?? "calm_flow",
          intensity: (data.intensity as number) ?? 0.5,
          visual_comment: data.visual_comment as string,
        });
        break;
      }
      case "agent_log": {
        const entry: AgentLogEntry = {
          id: `${timestamp}-${Math.random()}`,
          agent,
          event_type,
          message: (data.message as string) ?? JSON.stringify(data),
          timestamp,
          data,
        };
        setAgentLogs((prev) => [entry, ...prev].slice(0, 100));
        break;
      }
      case "negotiation": {
        const neg: NegotiationEntry = {
          from_agent: data.from_agent as string,
          to_agent: data.to_agent as string,
          proposal: data.proposal as string,
          reasoning: data.reasoning as string,
          agreed: data.agreed as boolean,
          timestamp,
        };
        setNegotiations((prev) => [neg, ...prev].slice(0, 50));
        // Also add to agent log
        const entry: AgentLogEntry = {
          id: `${timestamp}-neg`,
          agent: data.from_agent as string,
          event_type: "negotiation",
          message: `→ ${data.to_agent}: "${data.proposal}"`,
          timestamp,
          data,
        };
        setAgentLogs((prev) => [entry, ...prev].slice(0, 100));
        break;
      }
    }
  }, []);

  return { vibe, agentLogs, negotiations, visual, lastAgentLine, handleEvent };
}
