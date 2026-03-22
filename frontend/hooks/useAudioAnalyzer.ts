"use client";
import { useRef, useCallback, useState } from "react";
import { API_BASE } from "@/lib/constants";

export function useAudioAnalyzer() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [energy, setEnergy] = useState(0);

  const sendEnergy = useCallback(async (e: number) => {
    try {
      await fetch(`${API_BASE}/audio-energy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ energy: e }),
      });
    } catch {
      // silent fail — backend may not be ready
    }
  }, []);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ctx = new AudioContext();
      audioContextRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      let lastSendTime = 0;
      const SEND_INTERVAL_MS = 3000; // send every 3s — CrowdAgent reads every 30s
      const tick = (now: number) => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const normalized = Math.min(avg / 128, 1.0);
        setEnergy(normalized);

        if (now - lastSendTime >= SEND_INTERVAL_MS) {
          lastSendTime = now;
          sendEnergy(normalized);
        }

        frameRef.current = requestAnimationFrame(tick);
      };
      frameRef.current = requestAnimationFrame((now) => tick(now));
      setIsListening(true);
    } catch (e) {
      console.warn("[AudioAnalyzer] Mic access denied:", e);
    }
  }, [sendEnergy]);

  const stop = useCallback(() => {
    frameRef.current && cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioContextRef.current?.close();
    setIsListening(false);
    setEnergy(0);
  }, []);

  return { isListening, energy, start, stop };
}
