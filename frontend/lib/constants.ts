import type { VibeMood } from "./types";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000/ws";

export const AGENT_CONFIGS = {
  MoodAgent: {
    name: "MoodAgent",
    emoji: "🧠",
    color: "#8B5CF6",
    role: "Coordinator",
    personality: "Calm, wise orchestrator",
  },
  DJAgent: {
    name: "DJAgent",
    emoji: "🎵",
    color: "#06B6D4",
    role: "Music Director",
    personality: "Opinionated music snob",
  },
  CrowdAgent: {
    name: "CrowdAgent",
    emoji: "👥",
    color: "#10B981",
    role: "Crowd Sensor",
    personality: "Analytical, data-driven",
  },
  VisualAgent: {
    name: "VisualAgent",
    emoji: "🎨",
    color: "#EC4899",
    role: "Visual Director",
    personality: "Dreamy, dramatic artist",
  },
  SocialAgent: {
    name: "SocialAgent",
    emoji: "🎉",
    color: "#F59E0B",
    role: "Social Animator",
    personality: "Bubbly party host",
  },
  API: {
    name: "API",
    emoji: "⚡",
    color: "#64748B",
    role: "Gateway",
    personality: "Silent relay",
  },
} as const;

export const VIBE_COLORS: Record<VibeMood, { primary: string; secondary: string; glow: string }> = {
  chill:        { primary: "#22D3EE", secondary: "#67E8F9", glow: "rgba(34, 211, 238, 0.5)" },
  building:     { primary: "#A78BFA", secondary: "#C4B5FD", glow: "rgba(167, 139, 250, 0.5)" },
  peak:         { primary: "#F472B6", secondary: "#FB7185", glow: "rgba(244, 114, 182, 0.7)" },
  winding_down: { primary: "#34D399", secondary: "#6EE7B7", glow: "rgba(52, 211, 153, 0.4)" },
};

export const VIBE_LABELS: Record<VibeMood, string> = {
  chill: "CHILL",
  building: "BUILDING",
  peak: "PEAK",
  winding_down: "WINDING DOWN",
};

export const MOOD_DESCRIPTIONS: Record<VibeMood, string> = {
  chill: "Smooth vibes, low key energy",
  building: "The crowd is warming up...",
  peak: "WE ARE AT MAXIMUM HYPE",
  winding_down: "Bringing it home nice and easy",
};
