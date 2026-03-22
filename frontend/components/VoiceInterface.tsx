"use client";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { API_BASE, VIBE_COLORS } from "@/lib/constants";
import { useAudioAnalyzer } from "@/hooks/useAudioAnalyzer";
import { useTTS } from "@/hooks/useTTS";
import type { VibeMood } from "@/lib/types";

const QUICK_CMDS = [
  { label: "🔥 PEAK MODE", cmd: "peak mode" },
  { label: "🚀 PUMP IT UP", cmd: "pump it up" },
  { label: "🌊 CHILL OUT", cmd: "chill out" },
  { label: "🧊 ICE BREAKER", cmd: "icebreaker" },
  { label: "🌙 WIND DOWN", cmd: "wind down" },
];

interface Props {
  onCommand?: (text: string) => void;
  mood?: VibeMood;
}

export function VoiceInterface({ onCommand, mood = "chill" }: Props) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [lastResponse, setLastResponse] = useState<string | null>(null);
  const { isListening, energy, liveConnected, start, stop } = useAudioAnalyzer();
  const { speak } = useTTS();
  const colors = VIBE_COLORS[mood];

  const sendCommand = useCallback(async (commandText: string) => {
    if (!commandText.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: commandText, audio_energy: energy }),
      });
      if (res.ok) {
        const data = await res.json();
        const msg = data.message ?? "Command received!";
        setLastResponse(msg);
        onCommand?.(commandText);
        setText("");
        // Speak the MoodAgent's response via ElevenLabs (fallback: browser TTS)
        speak("mood", msg);
      }
    } catch {
      setLastResponse("Backend offline — running in demo mode");
    } finally {
      setSending(false);
    }
  }, [energy, onCommand, speak]);

  const toggleMic = useCallback(() => {
    if (isListening) stop();
    else start();
  }, [isListening, start, stop]);

  return (
    <div className="flex flex-col gap-2">
      {/* Command row */}
      <div className="flex items-center gap-3">
        {/* Mic button */}
        <motion.button
          onClick={toggleMic}
          className="relative w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer"
          style={{
            background: isListening ? `${colors.primary}22` : "rgba(255,255,255,0.05)",
            border: `1px solid ${isListening ? colors.primary : "rgba(255,255,255,0.1)"}`,
          }}
          whileTap={{ scale: 0.88 }}
          title={isListening ? "Stop mic" : "Start mic"}
          suppressHydrationWarning
        >
          {isListening && (
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ border: `2px solid ${colors.primary}` }}
              animate={{ scale: [1, 1.5, 1], opacity: [0.8, 0, 0.8] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
          <span className="text-lg" role="img" aria-label="mic">
            {isListening ? "🎙️" : "🎤"}
          </span>
        </motion.button>

        {/* Mic bars + Gemini Live status */}
        {isListening && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-end gap-0.5 h-8">
              {Array.from({ length: 10 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="w-1 rounded-full"
                  style={{ background: colors.primary }}
                  animate={{ height: `${Math.max(20, energy * 100 + Math.random() * 20)}%` }}
                  transition={{ duration: 0.1 }}
                />
              ))}
            </div>
            {/* Gemini Live indicator */}
            <span
              className="text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded-full"
              style={{
                color: liveConnected ? "#34D399" : "#94A3B8",
                background: liveConnected ? "rgba(52,211,153,0.12)" : "rgba(148,163,184,0.08)",
                border: `1px solid ${liveConnected ? "rgba(52,211,153,0.3)" : "rgba(148,163,184,0.2)"}`,
              }}
            >
              {liveConnected ? "LIVE AI" : "SENSING"}
            </span>
          </div>
        )}

        {/* Text input */}
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendCommand(text)}
          placeholder="Tell the agents what to do..."
          className="flex-1 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none placeholder-slate-600"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: `1px solid ${text ? colors.primary + "44" : "rgba(255,255,255,0.08)"}`,
            fontFamily: "monospace",
            transition: "border-color 0.2s",
          }}
          suppressHydrationWarning
        />

        {/* Send button */}
        <motion.button
          onClick={() => sendCommand(text)}
          disabled={sending || !text.trim()}
          className="px-5 py-2.5 rounded-xl text-sm font-black tracking-widest disabled:opacity-30 cursor-pointer flex-shrink-0"
          style={{
            background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
            color: "#07040F",
            boxShadow: sending ? "none" : `0 0 20px ${colors.primary}55`,
          }}
          whileTap={{ scale: 0.94 }}
          suppressHydrationWarning
        >
          {sending ? "..." : "SEND"}
        </motion.button>
      </div>

      {/* Quick commands + last response */}
      <div className="flex items-center gap-2 flex-wrap">
        {QUICK_CMDS.map(({ label, cmd }) => (
          <motion.button
            key={cmd}
            onClick={() => sendCommand(cmd)}
            className="text-xs px-3 py-1 rounded-full cursor-pointer font-mono"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#94A3B8",
            }}
            whileHover={{ background: `${colors.primary}22`, borderColor: `${colors.primary}55`, color: colors.primary }}
            whileTap={{ scale: 0.94 }}
            suppressHydrationWarning
          >
            {label}
          </motion.button>
        ))}

        <AnimatePresence>
          {lastResponse && (
            <motion.span
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="text-xs italic ml-2"
              style={{ color: colors.secondary }}
            >
              → {lastResponse}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
