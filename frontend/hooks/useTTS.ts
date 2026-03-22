"use client";
import { useRef, useCallback } from "react";

// ElevenLabs voice IDs per agent slot (premade voices, free tier)
const AGENT_VOICES: Record<string, string> = {
  mood: "21m00Tcm4TlvDq8ikWAM",   // Rachel — warm, clear
  dj: "TxGEqnHWrfWFTfGW9XjX",     // Josh — energetic
  crowd: "VR6AewLTigWG4xSOukaG",   // Arnold — commanding
  visual: "EXAVITQu4vr4xnSDxMaL",  // Bella — smooth
  social: "MF3mGyEYCl7XYWbV9V6O",  // Elli — friendly
};

/**
 * Puter.js TTS hook.
 * Uses puter.ai.txt2speech() for free ElevenLabs access (User-Pays model).
 * Falls back to browser speechSynthesis if Puter isn't loaded yet.
 */
export function useTTS() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const cancelCurrent = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (typeof window !== "undefined") {
      window.speechSynthesis?.cancel();
    }
  }, []);

  const speakFallback = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.95;
    utt.pitch = 0.85;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) => v.name.includes("Daniel") || v.name.includes("Google UK English Male") || v.name.includes("Alex")
    );
    if (preferred) utt.voice = preferred;
    window.speechSynthesis.speak(utt);
  }, []);

  const speak = useCallback(
    async (agent: string, text: string) => {
      if (!text?.trim()) return;
      cancelCurrent();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const puter = (typeof window !== "undefined" ? (window as any).puter : null);

      if (!puter?.ai?.txt2speech) {
        speakFallback(text);
        return;
      }

      try {
        const voiceId = AGENT_VOICES[agent] ?? AGENT_VOICES.mood;
        const audio: HTMLAudioElement = await puter.ai.txt2speech(text, {
          provider: "elevenlabs",
          voice: voiceId,
          model: "eleven_flash_v2_5",
        });
        audioRef.current = audio;
        audio.onended = () => { audioRef.current = null; };
        audio.play().catch(() => speakFallback(text));
      } catch {
        speakFallback(text);
      }
    },
    [cancelCurrent, speakFallback]
  );

  return { speak, cancel: cancelCurrent };
}
