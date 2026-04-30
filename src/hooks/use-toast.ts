"use client";

import { useState, useCallback } from "react";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "success" | "destructive";
}

let toastCounter = 0;

const listeners: Set<(toast: Toast) => void> = new Set();

export function toast(opts: Omit<Toast, "id">) {
  const t: Toast = { ...opts, id: String(++toastCounter) };
  listeners.forEach((fn) => fn(t));
  return t;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((t: Toast) => {
    setToasts((prev) => [...prev, t]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== t.id));
    }, 4000);
  }, []);

  const subscribe = useCallback(() => {
    listeners.add(addToast);
    return () => { listeners.delete(addToast); };
  }, [addToast]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  return { toasts, subscribe, dismiss, toast };
}
