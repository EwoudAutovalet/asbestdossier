"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, MessageSquare } from "lucide-react";
import type { Profile, MessageWithSender } from "@/lib/types";

interface ChatPanelProps {
  jobId: string;
  currentUser: Profile;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return d.toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) return "Gisteren";
  if (diffDays < 7) {
    return d.toLocaleDateString("nl-BE", { weekday: "short" });
  }
  return d.toLocaleDateString("nl-BE", { day: "numeric", month: "short" });
}

export function ChatPanel({ jobId, currentUser }: ChatPanelProps) {
  const supabase = createClient();
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function loadMessages() {
    const { data, error } = await supabase
      .from("messages")
      .select("*, sender:profiles(*)")
      .eq("job_id", jobId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setMessages(data as MessageWithSender[]);
    }
  }

  useEffect(() => {
    loadMessages();

    const channel = supabase
      .channel(`messages:${jobId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `job_id=eq.${jobId}`,
        },
        () => {
          loadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!expanded) return;
    const unread = messages.filter(
      (m) => m.sender_id !== currentUser.id && !m.read_at
    );
    if (unread.length > 0) {
      const ids = unread.map((m) => m.id);
      supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .in("id", ids)
        .then();
    }
  }, [expanded, messages]);

  async function handleSend() {
    const body = newMessage.trim();
    if (!body) return;
    setSending(true);
    try {
      const { error } = await supabase.from("messages").insert({
        job_id: jobId,
        sender_id: currentUser.id,
        body,
        read_at: null,
      });
      if (error) throw error;
      setNewMessage("");

      const { data: jobData } = await supabase
        .from("jobs")
        .select("specialist_id, property:properties(owner_id)")
        .eq("id", jobId)
        .single();

      if (jobData) {
        const recipientId =
          currentUser.role === "owner"
            ? jobData.specialist_id
            : (jobData.property as unknown as { owner_id: string })?.owner_id;

        if (recipientId) {
          await supabase.from("notifications").insert({
            user_id: recipientId,
            type: "message_received",
            title: "Nieuw bericht",
            body: body.length > 80 ? body.slice(0, 80) + "..." : body,
            link: null,
            read: false,
            metadata: { job_id: jobId, sender_name: currentUser.full_name },
          });
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Fout bij versturen";
      toast({ title: "Fout", description: message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  }

  const unreadCount = messages.filter(
    (m) => m.sender_id !== currentUser.id && !m.read_at
  ).length;

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-2 text-xs text-primary hover:underline mt-2"
      >
        <MessageSquare className="w-3.5 h-3.5" />
        Berichten ({messages.length})
        {unreadCount > 0 && (
          <span className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="mt-3 border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <MessageSquare className="w-3.5 h-3.5" />
          Berichten
        </div>
        <button
          onClick={() => setExpanded(false)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Sluiten
        </button>
      </div>

      <div
        ref={scrollRef}
        className="max-h-64 overflow-y-auto p-3 space-y-3"
      >
        {messages.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-6">
            Nog geen berichten. Start het gesprek!
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.sender_id === currentUser.id;
            return (
              <div
                key={msg.id}
                className={`flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}
              >
                <Avatar className="w-6 h-6 shrink-0">
                  <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                    {getInitials(msg.sender.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 text-xs ${
                    isOwn
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {!isOwn && (
                    <div className="font-semibold mb-0.5 text-[10px] opacity-70">
                      {msg.sender.full_name}
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{msg.body}</div>
                  <div
                    className={`text-[9px] mt-1 ${
                      isOwn ? "text-primary-foreground/60" : "text-muted-foreground"
                    }`}
                  >
                    {formatTime(msg.created_at)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-2 border-t flex gap-2">
        <Textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Typ een bericht..."
          className="text-xs min-h-[36px] h-9 resize-none"
          rows={1}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={sending || !newMessage.trim()}
          className="h-9 w-9 shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
