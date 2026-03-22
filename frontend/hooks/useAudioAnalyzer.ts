"use client";
import { useRef, useCallback, useState } from "react";
import { API_BASE, WS_URL } from "@/lib/constants";

// Derive audio-live WS URL from the base WS URL (handles both dev and prod)
// WS_URL = "ws://host/ws" → "ws://host/ws/audio-live"
const WS_AUDIO_URL = WS_URL.replace(/\/ws$/, "/ws/audio-live");

// PCM chunk size: 4096 samples @ 16kHz ≈ 256ms per chunk — good for Gemini Live
const PCM_CHUNK_SAMPLES = 4096;
const TARGET_SAMPLE_RATE = 16000;
// Send HTTP energy every 2s regardless of WS — keeps CrowdAgent fed even if Gemini Live fails
const HTTP_ENERGY_INTERVAL_MS = 2000;

export interface LiveEnergyEvent {
  energy: number;
  mood: string;
  description: string;
}

interface UseAudioAnalyzerOptions {
  onLiveEnergy?: (evt: LiveEnergyEvent) => void;
}

export function useAudioAnalyzer(opts: UseAudioAnalyzerOptions = {}) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pcmBufferRef = useRef<Float32Array[]>([]);
  const pcmSamplesRef = useRef<number>(0);

  const [isListening, setIsListening] = useState(false);
  const [energy, setEnergy] = useState(0);
  const [liveConnected, setLiveConnected] = useState(false);

  const sendEnergyFallback = useCallback(async (e: number) => {
    try {
      await fetch(`${API_BASE}/audio-energy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ energy: e }),
      });
    } catch {
      // silent fail
    }
  }, []);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // AudioContext at target 16kHz for Gemini Live — fallback to browser default
      let ctx: AudioContext;
      try {
        ctx = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });
      } catch {
        ctx = new AudioContext();
      }
      // Some browsers create AudioContext in suspended state — must resume for mic to work
      await ctx.resume();
      audioContextRef.current = ctx;

      // Analyser for energy meter display
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      // ScriptProcessor for raw PCM capture → Gemini Live
      const processor = ctx.createScriptProcessor(PCM_CHUNK_SAMPLES, 1, 1);
      processorRef.current = processor;
      source.connect(processor);
      processor.connect(ctx.destination);

      // Connect Gemini Live WebSocket
      const ws = new WebSocket(WS_AUDIO_URL);
      wsRef.current = ws;
      ws.binaryType = "arraybuffer";

      ws.onopen = () => {
        setLiveConnected(true);
        console.log("[AudioAnalyzer] Gemini Live connected");
      };
      ws.onclose = () => {
        setLiveConnected(false);
        console.log("[AudioAnalyzer] Gemini Live disconnected");
      };
      ws.onerror = (e) => {
        console.warn("[AudioAnalyzer] Gemini Live WS error:", e);
        setLiveConnected(false);
      };
      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data as string);
          if (msg.type === "live_energy" && opts.onLiveEnergy) {
            opts.onLiveEnergy({
              energy: msg.energy,
              mood: msg.mood,
              description: msg.description,
            });
          }
        } catch {
          // ignore non-JSON
        }
      };

      // Buffer PCM frames and send in TARGET_SAMPLE_RATE-sized chunks
      processor.onaudioprocess = (evt) => {
        const inputData = evt.inputBuffer.getChannelData(0);
        pcmBufferRef.current.push(new Float32Array(inputData));
        pcmSamplesRef.current += inputData.length;

        // Once we have enough samples, send to Gemini Live
        if (pcmSamplesRef.current >= PCM_CHUNK_SAMPLES) {
          if (ws.readyState === WebSocket.OPEN) {
            // Merge buffered Float32 chunks into Int16 PCM
            const total = pcmSamplesRef.current;
            const merged = new Float32Array(total);
            let offset = 0;
            for (const chunk of pcmBufferRef.current) {
              merged.set(chunk, offset);
              offset += chunk.length;
            }
            const pcm16 = new Int16Array(total);
            for (let i = 0; i < total; i++) {
              pcm16[i] = Math.max(-32768, Math.min(32767, merged[i] * 32767));
            }
            ws.send(pcm16.buffer);
          }
          // Reset buffer
          pcmBufferRef.current = [];
          pcmSamplesRef.current = 0;
        }
      };

      // Energy meter animation loop + HTTP energy sends to keep CrowdAgent fed
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let lastSendTime = 0;

      const tick = (now: number) => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const normalized = Math.min(avg / 128, 1.0);
        setEnergy(normalized);

        // Always send HTTP energy every 2s — CrowdAgent stays updated even if Gemini Live fails
        // Use wsRef.current to avoid stale closure on liveConnected state
        const wsOpen = wsRef.current?.readyState === WebSocket.OPEN;
        if (!wsOpen && now - lastSendTime >= HTTP_ENERGY_INTERVAL_MS) {
          lastSendTime = now;
          sendEnergyFallback(normalized);
        }

        frameRef.current = requestAnimationFrame(tick);
      };
      frameRef.current = requestAnimationFrame((now) => tick(now));
      setIsListening(true);
    } catch (e) {
      console.warn("[AudioAnalyzer] Mic access denied:", e);
    }
  }, [sendEnergyFallback, opts]);

  const stop = useCallback(() => {
    frameRef.current && cancelAnimationFrame(frameRef.current);
    processorRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioContextRef.current?.close();
    wsRef.current?.close();
    pcmBufferRef.current = [];
    pcmSamplesRef.current = 0;
    setIsListening(false);
    setLiveConnected(false);
    setEnergy(0);
  }, []);

  return { isListening, energy, liveConnected, start, stop };
}
