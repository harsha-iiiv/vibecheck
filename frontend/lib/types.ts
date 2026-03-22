export type VibeMood = "chill" | "building" | "peak" | "winding_down";

export interface TrackQueueItem {
  track_name: string;
  artist: string;
  youtube_id?: string;
  thumbnail_url?: string;
}

export type ReactionEmoji = "🔥" | "❄️" | "⚡" | "💀" | "🎉";

export interface VibeState {
  energy: number;
  mood: VibeMood;
  last_updated: number;
  music: {
    track_name: string;
    artist: string;
    bpm: number;
    energy_level?: number;
    dj_comment?: string;
    youtube_id?: string;
    thumbnail_url?: string;
  };
  social: {
    content: string;
    prompt_type: string;
  };
  session_id?: string;
}

export interface WebSocketEvent {
  event_type: "vibe_update" | "music" | "visual" | "social" | "agent_log" | "negotiation" | "user_command" | "music_queue" | "live_audio_energy";
  agent: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export interface AgentLogEntry {
  id: string;
  agent: string;
  event_type: string;
  message: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

export interface NegotiationEntry {
  from_agent: string;
  to_agent: string;
  proposal: string;
  reasoning?: string;
  agreed: boolean;
  timestamp: number;
}

export interface VisualParams {
  vibe_state: VibeMood;
  color_palette: string[];
  animation_style: string;
  intensity: number;
  visual_comment?: string;
}
