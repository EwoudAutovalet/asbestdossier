"use client";

import { useEffect } from "react";
import { X, CheckCircle2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function Toaster() {
  const { toasts, subscribe, dismiss } = useToast();

  useEffect(() => {
    return subscribe();
  }, [subscribe]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg bg-card animate-in slide-in-from-bottom-5 ${
            t.variant === "destructive" ? "border-destructive/50" : "border-border"
          }`}
        >
          {t.variant === "success" && (
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
          )}
          {t.variant === "destructive" && (
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">{t.title}</div>
            {t.description && (
              <div className="text-xs text-muted-foreground mt-0.5">{t.description}</div>
            )}
          </div>
          <button
            onClick={() => dismiss(t.id)}
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
