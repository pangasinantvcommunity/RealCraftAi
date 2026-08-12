"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fireToast } from "@/components/ToastStack";

export default function AudioRecorder() {
  const router = useRouter();
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const formattedTime = `${String(Math.floor(elapsedSeconds / 60)).padStart(2, "0")}:${String(
    elapsedSeconds % 60,
  ).padStart(2, "0")}`;

  const teardownWaveform = useCallback(() => {
    if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
    audioContextRef.current?.close();
    audioContextRef.current = null;
  }, []);

  const setupWaveform = useCallback((stream: MediaStream) => {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioContext = new AudioContextClass();
    audioContextRef.current = audioContext;

    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationIdRef.current = requestAnimationFrame(draw);
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx || !canvas) return;

      analyser.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
        gradient.addColorStop(0, "#7C4DFF");
        gradient.addColorStop(1, "#00E5FF");
        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };
    draw();
  }, []);

  const startRecording = useCallback(async () => {
    setErrorMessage("");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      const message = "Microphone access was denied. Please allow microphone access to record.";
      setErrorMessage(message);
      fireToast({ type: "error", message });
      return;
    }

    streamRef.current = stream;
    audioChunksRef.current = [];
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data);
    };
    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      setAudioBlob(blob);
      setAudioUrl(URL.createObjectURL(blob));
    };

    mediaRecorder.start();
    setRecording(true);
    setElapsedSeconds(0);
    timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    setupWaveform(stream);
  }, [setupWaveform]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    teardownWaveform();
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, [teardownWaveform]);

  const toggleRecording = () => (recording ? stopRecording() : startRecording());

  const resetRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setElapsedSeconds(0);
    setErrorMessage("");
  };

  const playPreview = () => {
    if (audioUrl) new Audio(audioUrl).play();
  };

  const submit = async () => {
    if (!audioBlob || uploading) return;
    setUploading(true);
    setErrorMessage("");

    const formData = new FormData();
    const filename = audioBlob instanceof File ? audioBlob.name : `recording-${Date.now()}.webm`;
    formData.append("audio", audioBlob, filename);

    try {
      const response = await fetch("/api/stories", { method: "POST", body: formData });

      if (response.status === 429) {
        router.push("/dashboard?limitReached=1");
        return;
      }

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Upload failed");
      }

      const { id } = await response.json();
      router.push(`/stories/${id}`);
    } catch {
      setUploading(false);
      const message = "Upload failed. Please check your connection and try again.";
      setErrorMessage(message);
      fireToast({ type: "error", message });
    }
  };

  return (
    <div className="glass-panel p-8 sm:p-10">
      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={toggleRecording}
          className={`relative flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 shadow-glow transition-transform hover:scale-105 ${
            recording ? "animate-pulse-glow" : ""
          }`}
        >
          <span className="text-4xl">{recording ? "⏸️" : "🎙️"}</span>
          <span className={`absolute inset-0 rounded-full border border-white/20 ${recording ? "animate-ping" : ""}`} />
        </button>

        <p className="mt-5 font-heading text-2xl tabular-nums text-white">{formattedTime}</p>
        <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
          {recording ? "Recording..." : audioBlob ? "Recording ready" : "Tap to record"}
        </p>

        <canvas ref={canvasRef} className="mt-6 h-16 w-full max-w-md" width={480} height={64} />

        {audioBlob && (
          <div className="mt-6 flex gap-3">
            <button type="button" className="btn-secondary !px-5 !py-2 text-xs" onClick={resetRecording}>
              Discard
            </button>
            <button type="button" className="btn-secondary !px-5 !py-2 text-xs" onClick={playPreview}>
              ▶ Preview
            </button>
          </div>
        )}
      </div>

      {errorMessage && <p className="mt-4 text-center text-sm text-red-400">{errorMessage}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={!audioBlob || uploading}
        className="btn-primary mt-8 w-full"
      >
        {uploading ? "Uploading..." : "Generate My Story"}
      </button>
    </div>
  );
}
