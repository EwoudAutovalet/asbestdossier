"use client";

import { AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContextActieBlokProps {
  role: "owner" | "specialist" | "broker";
  hasIssuedCertificate: boolean;
  hasCompletedInspection: boolean;
  hasActiveJob: boolean;
  hasDisposalProofForAllJobs: boolean;
  isCleared: boolean;
  className?: string;
}

export function ContextActieBlok({
  role,
  hasIssuedCertificate,
  hasCompletedInspection,
  hasActiveJob,
  hasDisposalProofForAllJobs,
  isCleared,
  className,
}: ContextActieBlokProps) {
  type MessageType = "amber" | "blue" | "green";
  let message: { text: string; type: MessageType } | null = null;

  if (isCleared) {
    if (role !== "specialist") {
      message = { text: "Dit pand is Asbestveilig verklaard.", type: "green" };
    }
  } else if (!hasIssuedCertificate) {
    message =
      role === "specialist"
        ? { text: "Stap 1: Maak het AIA-asbestattest op voor dit pand.", type: "amber" }
        : { text: "Wachten op: De specialist stelt het AIA-attest op.", type: "blue" };
  } else if (!hasCompletedInspection) {
    message =
      role === "specialist"
        ? { text: "Stap 2: Voer de IP2-inspectie uit en sla de checklist op.", type: "amber" }
        : { text: "Wachten op: IP2-inspectie door de specialist.", type: "blue" };
  } else if (!hasActiveJob) {
    if (role !== "specialist") {
      message = { text: "Stap 3: Maak een opdracht aan om de verwijdering op te starten.", type: "amber" };
    }
  } else if (!hasDisposalProofForAllJobs) {
    message =
      role === "specialist"
        ? { text: "Stap 4: Upload het VLAREMA-afvalcertificaat voor alle verwijderingsopdrachten.", type: "amber" }
        : { text: "Wachten op: Afvalcertificaat van de specialist.", type: "blue" };
  } else {
    if (role !== "specialist") {
      message = { text: "Stap 5: Alle stappen zijn voltooid. Sluit het dossier af als Asbestveilig.", type: "amber" };
    }
  }

  if (!message) return null;

  const styles: Record<MessageType, string> = {
    amber: "bg-amber-50 border-amber-200 text-amber-900",
    blue: "bg-blue-50 border-blue-200 text-blue-900",
    green: "bg-green-50 border-green-200 text-green-900",
  };

  const iconColor: Record<MessageType, string> = {
    amber: "text-amber-600",
    blue: "text-blue-600",
    green: "text-green-600",
  };

  const Icon = message.type === "green" ? CheckCircle2 : message.type === "blue" ? Info : AlertTriangle;

  return (
    <div className={cn(`rounded-lg border p-3 flex items-start gap-3 text-sm ${styles[message.type]}`, className)}>
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${iconColor[message.type]}`} />
      <span>{message.text}</span>
    </div>
  );
}
