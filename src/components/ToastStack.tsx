"use client";

import { useEffect, useState } from "react";

type Toast = { type: "error" | "info"; message: string };

export function fireToast(toast: Toast) {
  window.dispatchEvent(new CustomEvent<Toast>("toast", { detail: toast }));
}

export default function ToastStack() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const handler = (event: Event) => {
      const toast = (event as CustomEvent<Toast>).detail;
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => setToasts((prev) => prev.slice(1)), 4500);
    };

    window.addEventListener("toast", handler);
    return () => window.removeEventListener("toast", handler);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-6 z-[100] flex flex-col items-center gap-3 px-4">
      {toasts.map((toast, index) => (
        <div
          key={index}
          className={`glass-panel pointer-events-auto flex max-w-md items-center gap-3 px-5 py-3.5 ${
            toast.type === "error" ? "border-red-500/40" : "border-violet-500/40"
          }`}
        >
          <span
            className={`status-dot ${
              toast.type === "error" ? "bg-red-400 text-red-400" : "bg-cyan-400 text-cyan-400"
            }`}
          />
          <p className="text-sm text-zinc-100">{toast.message}</p>
        </div>
      ))}
    </div>
  );
}
