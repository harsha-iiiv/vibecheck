"use client";
import { useRef, useCallback, useState } from "react";
import { API_BASE } from "@/lib/constants";

function browserSpeak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 1.05;
  utt.pitch = 1.0;
  window.speechSynthesis.speak(utt);
}

/**
 * TTS hook — calls backend /api/tts (ElevenLabs eleven_v3).
 * Falls back to browser speechSynthesis when backend returns 204 (quota/key issue).
 */
export function useTTS() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [speakingAgent, setSpeakingAgent] = useState<string | null>(null);

  const cancel = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setSpeakingAgent(null);
  }, []);

  const speak = useCallback(
    async (agent: string, text: string) => {
      if (!text?.trim()) return;
      cancel();
      setSpeakingAgent(agent);

      try {
        const res = await fetch(`${API_BASE}/tts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agent, text }),
        });

        if (res.status === 204 || !res.ok) {
          browserSpeak(text);
          // Browser TTS has no reliable end event — clear after estimated duration
          const ms = Math.max(2000, text.length * 65);
          setTimeout(() => setSpeakingAgent(null), ms);
          return;
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          URL.revokeObjectURL(url);
          audioRef.current = null;
          setSpeakingAgent(null);
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          audioRef.current = null;
          setSpeakingAgent(null);
        };
        await audio.play();
      } catch (e) {
        console.warn("[TTS] Failed, using browser fallback:", e);
        browserSpeak(text);
        setTimeout(() => setSpeakingAgent(null), Math.max(2000, text.length * 65));
      }
    },
    [cancel]
  );

  return { speak, cancel, speakingAgent };
}
