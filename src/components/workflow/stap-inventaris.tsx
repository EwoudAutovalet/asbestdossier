"use client";

import { Shield, Plus, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Property, InventoryCertificate, CertificateItem } from "@/lib/types";
import { CERTIFICATE_STATUS_LABELS, RISK_LEVEL_LABELS, RECOMMENDED_ACTION_LABELS } from "@/lib/types";

interface StapInventarisProps {
  property: Property;
  certificates: (InventoryCertificate & { items: CertificateItem[] })[];
  role: "owner" | "specialist" | "broker";
  onNavigateToAttest: () => void;
}

export function StapInventaris({ property: _property, certificates, role, onNavigateToAttest }: StapInventarisProps) {
  const hasIssuedCert = certificates.some((c) => c.status === "issued");

  return (
    <div className="space-y-4">
      {/* Legal info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-800">
            Een Asbestinventarisatie-attest (AIA) is wettelijk verplicht voor gebouwen met bouwvergunning vóór 2001.
            Het attest heeft een geldigheid van 5 jaar en wordt opgemaakt door een erkend asbestdeskundige.
          </p>
        </div>
      </div>

      {/* No issued certificate */}
      {(!certificates.length || !hasIssuedCert) ? (
        <div className="p-8 text-center text-sm text-muted-foreground border-2 border-dashed rounded-lg">
          <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-semibold mb-1">Nog geen geldig AIA-attest</p>
          {role === "specialist" ? (
            <Button size="sm" variant="outline" className="mt-2" onClick={onNavigateToAttest}>
              <Plus className="w-4 h-4 mr-1.5" />
              Attest opmaken
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">
              De specialist kan een attest opmaken vanuit dit dossier.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {certificates.map((cert) => (
            <div key={cert.id} className="p-4 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-sm font-mono font-bold">{cert.certificate_number}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {cert.issued_at
                      ? `Uitgegeven: ${new Date(cert.issued_at).toLocaleDateString("nl-BE", { day: "numeric", month: "short", year: "numeric" })}`
                      : "Concept"}
                    {cert.expires_at &&
                      ` — Vervalt: ${new Date(cert.expires_at).toLocaleDateString("nl-BE", { day: "numeric", month: "short", year: "numeric" })}`}
                  </div>
                </div>
                <Badge
                  variant={
                    cert.status === "issued"
                      ? "success"
                      : cert.status === "expired" || cert.status === "revoked"
                      ? "destructive"
                      : "warning"
                  }
                >
                  {CERTIFICATE_STATUS_LABELS[cert.status]}
                </Badge>
              </div>
              {cert.conclusion && (
                <p className="text-xs text-muted-foreground mt-2 bg-muted/50 p-2 rounded">{cert.conclusion}</p>
              )}
              {cert.items.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {cert.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 text-xs p-2 rounded bg-muted/30">
                      <Badge
                        variant={
                          item.risk_level === "kritiek" || item.risk_level === "hoog"
                            ? "destructive"
                            : item.risk_level === "gemiddeld"
                            ? "warning"
                            : "success"
                        }
                        className="text-[9px]"
                      >
                        {RISK_LEVEL_LABELS[item.risk_level]}
                      </Badge>
                      <span className="font-medium">{item.material_type}</span>
                      <span className="text-muted-foreground">— {item.location}</span>
                      <Badge variant="secondary" className="text-[9px] ml-auto">
                        {RECOMMENDED_ACTION_LABELS[item.recommended_action]}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New attest button for specialists when certs already exist */}
      {certificates.length > 0 && role === "specialist" && (
        <Button size="sm" variant="outline" onClick={onNavigateToAttest}>
          <Plus className="w-4 h-4 mr-1.5" />
          Nieuw attest opmaken
        </Button>
      )}
    </div>
  );
}
