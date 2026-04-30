"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Calendar } from "lucide-react";
import type { QuoteWithLines } from "@/lib/types";
import { QUOTE_STATUS_LABELS } from "@/lib/types";

interface QuoteDetailProps {
  quote: QuoteWithLines;
  jobId: string;
  onResponded?: () => void;
}

export function QuoteDetail({ quote, jobId, onResponded }: QuoteDetailProps) {
  const supabase = createClient();
  const [responding, setResponding] = useState(false);

  async function handleRespond(action: "approved" | "rejected") {
    setResponding(true);
    try {
      const { error } = await supabase
        .from("quotes")
        .update({
          status: action,
          responded_at: new Date().toISOString(),
        })
        .eq("id", quote.id);
      if (error) throw error;

      if (action === "approved") {
        await supabase.from("jobs").update({
          status: "approved",
          total_cost: quote.total_cost,
        }).eq("id", jobId);
      }

      toast({
        title: action === "approved" ? "Offerte goedgekeurd" : "Offerte afgewezen",
        description:
          action === "approved"
            ? "De specialist wordt op de hoogte gebracht."
            : "De specialist kan een nieuwe offerte indienen.",
        variant: action === "approved" ? "success" : "destructive",
      });

      onResponded?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Onbekende fout";
      toast({ title: "Fout", description: message, variant: "destructive" });
    } finally {
      setResponding(false);
    }
  }

  const statusVariant =
    quote.status === "approved"
      ? "success"
      : quote.status === "rejected"
      ? "destructive"
      : quote.status === "submitted"
      ? "info"
      : "warning";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Offerte</CardTitle>
          <Badge variant={statusVariant}>
            {QUOTE_STATUS_LABELS[quote.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {quote.description && (
          <p className="text-sm text-muted-foreground">{quote.description}</p>
        )}

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-muted/50 rounded-md p-2.5">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
              Arbeid
            </div>
            <div className="font-mono font-semibold text-sm">
              &euro;{quote.labor_cost.toLocaleString("nl-BE", { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="bg-muted/50 rounded-md p-2.5">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
              Materiaal
            </div>
            <div className="font-mono font-semibold text-sm">
              &euro;{quote.material_cost.toLocaleString("nl-BE", { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="bg-muted/50 rounded-md p-2.5">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
              Afvoer
            </div>
            <div className="font-mono font-semibold text-sm">
              &euro;{quote.disposal_cost.toLocaleString("nl-BE", { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {quote.lines.length > 0 && (
          <div className="border rounded-md overflow-hidden">
            <div className="grid grid-cols-[1fr_60px_60px_80px_90px] gap-1 px-3 py-1.5 bg-muted/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <span>Omschrijving</span>
              <span>Aantal</span>
              <span>Eenheid</span>
              <span>Prijs</span>
              <span className="text-right">Totaal</span>
            </div>
            {quote.lines.map((line) => (
              <div
                key={line.id}
                className="grid grid-cols-[1fr_60px_60px_80px_90px] gap-1 px-3 py-2 border-t text-sm"
              >
                <span>{line.description}</span>
                <span className="font-mono">{line.quantity}</span>
                <span className="text-muted-foreground">{line.unit}</span>
                <span className="font-mono">
                  &euro;{line.unit_price.toLocaleString("nl-BE", { minimumFractionDigits: 2 })}
                </span>
                <span className="font-mono text-right font-semibold">
                  &euro;{line.total.toLocaleString("nl-BE", { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {quote.valid_until && (
              <>
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  Geldig tot{" "}
                  {new Date(quote.valid_until).toLocaleDateString("nl-BE", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </>
            )}
          </div>
          <div className="text-right">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
              Totaal
            </div>
            <div className="text-xl font-extrabold font-mono">
              &euro;{quote.total_cost.toLocaleString("nl-BE", { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {quote.notes && (
          <div className="bg-muted/30 rounded-md p-3 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground text-xs">Opmerkingen:</span>
            <p className="mt-1">{quote.notes}</p>
          </div>
        )}

        {quote.status === "submitted" && (
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => handleRespond("rejected")}
              disabled={responding}
              className="flex-1 border-red-200 text-red-700 hover:bg-red-50"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Afwijzen
            </Button>
            <Button
              onClick={() => handleRespond("approved")}
              disabled={responding}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Goedkeuren
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
