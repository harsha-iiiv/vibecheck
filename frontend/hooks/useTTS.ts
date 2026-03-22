"use client";
import { useRef, useCallback } from "react";
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

  const cancel = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  }, []);

  const speak = useCallback(
    async (agent: string, text: string) => {
      if (!text?.trim()) return;
      cancel();

      try {
        const res = await fetch(`${API_BASE}/api/tts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agent, text }),
        });

        if (res.status === 204 || !res.ok) {
          // ElevenLabs unavailable — fall back to browser TTS
          browserSpeak(text);
          return;
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          URL.revokeObjectURL(url);
          audioRef.current = null;
        };
        await audio.play();
      } catch (e) {
        console.warn("[TTS] Failed, using browser fallback:", e);
        browserSpeak(text);
      }
    },
    [cancel]
  );

  return { speak, cancel };
}
