"use client";

import { Clock, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TimelineEvent, Profile } from "@/lib/types";

interface ActivityLogPanelProps {
  timeline: (TimelineEvent & { actor: Profile })[];
  isOpen: boolean;
  onClose: () => void;
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("nl-BE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("nl-BE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ActivityLogPanel({ timeline, isOpen, onClose }: ActivityLogPanelProps) {
  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed right-0 top-0 h-full w-full max-w-sm bg-background border-l shadow-xl z-50 flex flex-col transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2 font-semibold">
            <Clock className="w-4 h-4" /> Activiteitenlog
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4">
          {timeline.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground pt-8">
              <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
              Nog geen activiteiten.
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
              <div className="space-y-0">
                {timeline.map((event) => (
                  <div key={event.id} className="relative flex gap-4 pb-6">
                    <div className="relative z-10">
                      <Avatar className="h-10 w-10 border-2 border-background">
                        <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                          {getInitials(event.actor?.full_name || "?")}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="text-sm font-medium">{event.action}</div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground font-mono">
                          {formatDate(event.created_at)} — {formatTime(event.created_at)}
                        </span>
                        <Badge variant="secondary" className="text-[10px]">
                          {event.actor?.role === "owner" ? "Eigenaar" : "Specialist"}
                        </Badge>
                      </div>
                      {(() => {
                        const details = event.details as Record<string, unknown> | null;
                        if (
                          details &&
                          typeof details === "object" &&
                          "description" in details &&
                          details.description
                        ) {
                          return (
                            <p className="text-xs text-muted-foreground mt-1.5 bg-muted/50 rounded p-2">
                              {String(details.description)}
                            </p>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
