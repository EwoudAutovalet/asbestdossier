"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import type {
  Property,
  Profile,
  Job,
  Attachment,
  Removal,
  InspectionChecklist,
  ChecklistItem,
  QuoteWithLines,
} from "@/lib/types";
import {
  PROPERTY_STATUS_LABELS,
  JOB_STATUS_LABELS,
  RISK_LEVEL_LABELS,
  CONDITION_LABELS,
  PRIORITY_LABELS,
  QUOTE_STATUS_LABELS,
} from "@/lib/types";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
  },
  header: {
    marginBottom: 20,
    borderBottom: "2 solid #1e40af",
    paddingBottom: 12,
  },
  title: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: "#1e40af",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    color: "#64748b",
  },
  reportMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    fontSize: 8,
    color: "#64748b",
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#1e40af",
    marginTop: 16,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottom: "1 solid #dbeafe",
  },
  subsectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginTop: 10,
    marginBottom: 4,
    color: "#334155",
  },
  row: {
    flexDirection: "row",
    marginBottom: 3,
  },
  label: {
    width: 140,
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: "#64748b",
    textTransform: "uppercase",
  },
  value: {
    flex: 1,
    fontSize: 9,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderBottom: "1 solid #cbd5e1",
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  tableHeaderCell: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    color: "#475569",
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "0.5 solid #e2e8f0",
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  tableCell: {
    fontSize: 8,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
  },
  riskHigh: {
    backgroundColor: "#fef2f2",
    color: "#dc2626",
  },
  riskMedium: {
    backgroundColor: "#fffbeb",
    color: "#d97706",
  },
  riskLow: {
    backgroundColor: "#f0fdf4",
    color: "#16a34a",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#94a3b8",
    borderTop: "0.5 solid #e2e8f0",
    paddingTop: 6,
  },
  card: {
    border: "1 solid #e2e8f0",
    borderRadius: 4,
    padding: 10,
    marginBottom: 8,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 4,
    paddingTop: 4,
    borderTop: "1 solid #cbd5e1",
  },
  totalLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    marginRight: 8,
  },
  totalValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: "#1e40af",
  },
});

function formatDate(dateStr: string | null) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("nl-BE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function riskStyle(level: string | null) {
  if (level === "hoog" || level === "kritiek") return styles.riskHigh;
  if (level === "gemiddeld") return styles.riskMedium;
  return styles.riskLow;
}

interface ReportData {
  property: Property;
  owner: Profile | null;
  jobs: (Job & {
    specialist: Profile | null;
    attachments: Attachment[];
    removals: Removal[];
    checklists: (InspectionChecklist & { items: ChecklistItem[] })[];
    quotes: QuoteWithLines[];
  })[];
}

function AsbestReport({ property, owner, jobs }: ReportData) {
  const now = new Date().toLocaleDateString("nl-BE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Asbestinventarisatierapport</Text>
          <Text style={styles.subtitle}>
            Conform OVAM-richtlijnen voor asbestinventarisatie
          </Text>
          <View style={styles.reportMeta}>
            <Text>Rapportdatum: {now}</Text>
            <Text>AsbestControl - Digitaal Dossier</Text>
          </View>
        </View>

        {/* Property info */}
        <Text style={styles.sectionTitle}>1. Gebouwgegevens</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Adres</Text>
          <Text style={styles.value}>
            {property.address}, {property.postal_code} {property.city}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Status</Text>
          <Text style={styles.value}>
            {PROPERTY_STATUS_LABELS[property.status]}
          </Text>
        </View>
        {property.description && (
          <View style={styles.row}>
            <Text style={styles.label}>Beschrijving</Text>
            <Text style={styles.value}>{property.description}</Text>
          </View>
        )}

        {/* Owner info */}
        {owner && (
          <>
            <Text style={styles.sectionTitle}>2. Opdrachtgever</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Naam</Text>
              <Text style={styles.value}>{owner.full_name}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>E-mail</Text>
              <Text style={styles.value}>{owner.email}</Text>
            </View>
            {owner.phone && (
              <View style={styles.row}>
                <Text style={styles.label}>Telefoon</Text>
                <Text style={styles.value}>{owner.phone}</Text>
              </View>
            )}
            {owner.company_name && (
              <View style={styles.row}>
                <Text style={styles.label}>Bedrijf</Text>
                <Text style={styles.value}>
                  {owner.company_name}
                  {owner.company_vat ? ` (BTW: ${owner.company_vat})` : ""}
                </Text>
              </View>
            )}
          </>
        )}

        {/* Jobs overview */}
        <Text style={styles.sectionTitle}>3. Opdrachten overzicht</Text>
        {jobs.length === 0 ? (
          <Text style={{ color: "#94a3b8" }}>
            Geen opdrachten geregistreerd.
          </Text>
        ) : (
          <View>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: "30%" }]}>
                Titel
              </Text>
              <Text style={[styles.tableHeaderCell, { width: "20%" }]}>
                Specialist
              </Text>
              <Text style={[styles.tableHeaderCell, { width: "15%" }]}>
                Status
              </Text>
              <Text style={[styles.tableHeaderCell, { width: "15%" }]}>
                Kosten
              </Text>
              <Text style={[styles.tableHeaderCell, { width: "20%" }]}>
                Datum
              </Text>
            </View>
            {jobs.map((job) => (
              <View key={job.id} style={styles.tableRow}>
                <Text style={[styles.tableCell, { width: "30%" }]}>
                  {job.title}
                </Text>
                <Text style={[styles.tableCell, { width: "20%" }]}>
                  {job.specialist?.company_name ||
                    job.specialist?.full_name ||
                    "-"}
                </Text>
                <Text style={[styles.tableCell, { width: "15%" }]}>
                  {JOB_STATUS_LABELS[job.status]}
                </Text>
                <Text style={[styles.tableCell, { width: "15%" }]}>
                  {job.total_cost
                    ? `€${job.total_cost.toLocaleString("nl-BE")}`
                    : "-"}
                </Text>
                <Text style={[styles.tableCell, { width: "20%" }]}>
                  {formatDate(job.created_at)}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.footer}>
          <Text>AsbestControl - Vertrouwelijk document</Text>
          <Text>Pagina 1</Text>
        </View>
      </Page>

      {/* Inspection details pages */}
      {jobs.map((job, jobIndex) => {
        const hasChecklists = job.checklists.length > 0;
        const hasRemovals = job.removals.length > 0;
        const hasQuotes = job.quotes.length > 0;

        if (!hasChecklists && !hasRemovals && !hasQuotes) return null;

        return (
          <Page key={job.id} size="A4" style={styles.page}>
            <View style={styles.header}>
              <Text style={[styles.title, { fontSize: 14 }]}>
                {job.title}
              </Text>
              <Text style={styles.subtitle}>
                {JOB_STATUS_LABELS[job.status]} — {property.address}
              </Text>
            </View>

            {/* Inspection checklists */}
            {hasChecklists && (
              <>
                <Text style={styles.sectionTitle}>Inspectieresultaten</Text>
                {job.checklists.map((checklist, ci) => (
                  <View key={checklist.id} style={styles.card}>
                    <View style={styles.row}>
                      <Text style={styles.label}>Inspectiedatum</Text>
                      <Text style={styles.value}>
                        {formatDate(checklist.inspected_at)}
                      </Text>
                    </View>
                    {checklist.risk_level && (
                      <View style={styles.row}>
                        <Text style={styles.label}>Risicobeoordeling</Text>
                        <Text
                          style={[
                            styles.badge,
                            riskStyle(checklist.risk_level),
                          ]}
                        >
                          {RISK_LEVEL_LABELS[checklist.risk_level]}
                        </Text>
                      </View>
                    )}
                    {checklist.general_condition && (
                      <View style={styles.row}>
                        <Text style={styles.label}>Algemene toestand</Text>
                        <Text style={styles.value}>
                          {checklist.general_condition}
                        </Text>
                      </View>
                    )}
                    {checklist.notes && (
                      <View style={styles.row}>
                        <Text style={styles.label}>Opmerkingen</Text>
                        <Text style={styles.value}>{checklist.notes}</Text>
                      </View>
                    )}

                    {checklist.items.length > 0 && (
                      <>
                        <Text style={styles.subsectionTitle}>
                          Geïnspecteerde materialen
                        </Text>
                        <View style={styles.tableHeader}>
                          <Text
                            style={[
                              styles.tableHeaderCell,
                              { width: "20%" },
                            ]}
                          >
                            Categorie
                          </Text>
                          <Text
                            style={[
                              styles.tableHeaderCell,
                              { width: "20%" },
                            ]}
                          >
                            Materiaal
                          </Text>
                          <Text
                            style={[
                              styles.tableHeaderCell,
                              { width: "10%" },
                            ]}
                          >
                            Asbest
                          </Text>
                          <Text
                            style={[
                              styles.tableHeaderCell,
                              { width: "15%" },
                            ]}
                          >
                            Toestand
                          </Text>
                          <Text
                            style={[
                              styles.tableHeaderCell,
                              { width: "15%" },
                            ]}
                          >
                            Prioriteit
                          </Text>
                          <Text
                            style={[
                              styles.tableHeaderCell,
                              { width: "20%" },
                            ]}
                          >
                            Locatie
                          </Text>
                        </View>
                        {checklist.items.map((item) => (
                          <View key={item.id} style={styles.tableRow}>
                            <Text
                              style={[styles.tableCell, { width: "20%" }]}
                            >
                              {item.category}
                            </Text>
                            <Text
                              style={[styles.tableCell, { width: "20%" }]}
                            >
                              {item.item_name}
                            </Text>
                            <Text
                              style={[styles.tableCell, { width: "10%" }]}
                            >
                              {item.contains_asbestos === null
                                ? "?"
                                : item.contains_asbestos
                                ? "Ja"
                                : "Nee"}
                            </Text>
                            <Text
                              style={[styles.tableCell, { width: "15%" }]}
                            >
                              {item.condition
                                ? CONDITION_LABELS[item.condition]
                                : "-"}
                            </Text>
                            <Text
                              style={[styles.tableCell, { width: "15%" }]}
                            >
                              {item.priority
                                ? PRIORITY_LABELS[item.priority]
                                : "-"}
                            </Text>
                            <Text
                              style={[styles.tableCell, { width: "20%" }]}
                            >
                              {item.location_description || "-"}
                            </Text>
                          </View>
                        ))}
                      </>
                    )}
                  </View>
                ))}
              </>
            )}

            {/* Removals */}
            {hasRemovals && (
              <>
                <Text style={styles.sectionTitle}>Verwijderingen</Text>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderCell, { width: "25%" }]}>
                    Component
                  </Text>
                  <Text style={[styles.tableHeaderCell, { width: "25%" }]}>
                    Locatie
                  </Text>
                  <Text style={[styles.tableHeaderCell, { width: "30%" }]}>
                    Beschrijving
                  </Text>
                  <Text style={[styles.tableHeaderCell, { width: "20%" }]}>
                    Datum
                  </Text>
                </View>
                {job.removals.map((removal) => (
                  <View key={removal.id} style={styles.tableRow}>
                    <Text style={[styles.tableCell, { width: "25%" }]}>
                      {removal.component_name}
                    </Text>
                    <Text style={[styles.tableCell, { width: "25%" }]}>
                      {removal.location}
                    </Text>
                    <Text style={[styles.tableCell, { width: "30%" }]}>
                      {removal.description || "-"}
                    </Text>
                    <Text style={[styles.tableCell, { width: "20%" }]}>
                      {formatDate(removal.removed_at)}
                    </Text>
                  </View>
                ))}
              </>
            )}

            {/* Quotes */}
            {hasQuotes && (
              <>
                <Text style={styles.sectionTitle}>Offertes</Text>
                {job.quotes.map((quote) => (
                  <View key={quote.id} style={styles.card}>
                    <View style={styles.row}>
                      <Text style={styles.label}>Status</Text>
                      <Text style={styles.value}>
                        {QUOTE_STATUS_LABELS[quote.status]}
                      </Text>
                    </View>
                    {quote.description && (
                      <View style={styles.row}>
                        <Text style={styles.label}>Omschrijving</Text>
                        <Text style={styles.value}>{quote.description}</Text>
                      </View>
                    )}
                    <View style={styles.row}>
                      <Text style={styles.label}>Arbeidskosten</Text>
                      <Text style={styles.value}>
                        €{quote.labor_cost.toLocaleString("nl-BE", { minimumFractionDigits: 2 })}
                      </Text>
                    </View>
                    <View style={styles.row}>
                      <Text style={styles.label}>Materiaalkosten</Text>
                      <Text style={styles.value}>
                        €{quote.material_cost.toLocaleString("nl-BE", { minimumFractionDigits: 2 })}
                      </Text>
                    </View>
                    <View style={styles.row}>
                      <Text style={styles.label}>Afvoerkosten</Text>
                      <Text style={styles.value}>
                        €{quote.disposal_cost.toLocaleString("nl-BE", { minimumFractionDigits: 2 })}
                      </Text>
                    </View>

                    {quote.lines.length > 0 && (
                      <>
                        <Text style={styles.subsectionTitle}>
                          Offerteregels
                        </Text>
                        <View style={styles.tableHeader}>
                          <Text
                            style={[
                              styles.tableHeaderCell,
                              { width: "35%" },
                            ]}
                          >
                            Omschrijving
                          </Text>
                          <Text
                            style={[
                              styles.tableHeaderCell,
                              { width: "15%" },
                            ]}
                          >
                            Aantal
                          </Text>
                          <Text
                            style={[
                              styles.tableHeaderCell,
                              { width: "15%" },
                            ]}
                          >
                            Eenheid
                          </Text>
                          <Text
                            style={[
                              styles.tableHeaderCell,
                              { width: "15%" },
                            ]}
                          >
                            Prijs
                          </Text>
                          <Text
                            style={[
                              styles.tableHeaderCell,
                              { width: "20%" },
                            ]}
                          >
                            Totaal
                          </Text>
                        </View>
                        {quote.lines.map((line) => (
                          <View key={line.id} style={styles.tableRow}>
                            <Text
                              style={[styles.tableCell, { width: "35%" }]}
                            >
                              {line.description}
                            </Text>
                            <Text
                              style={[styles.tableCell, { width: "15%" }]}
                            >
                              {line.quantity}
                            </Text>
                            <Text
                              style={[styles.tableCell, { width: "15%" }]}
                            >
                              {line.unit}
                            </Text>
                            <Text
                              style={[styles.tableCell, { width: "15%" }]}
                            >
                              €{line.unit_price.toLocaleString("nl-BE", { minimumFractionDigits: 2 })}
                            </Text>
                            <Text
                              style={[styles.tableCell, { width: "20%" }]}
                            >
                              €{line.total.toLocaleString("nl-BE", { minimumFractionDigits: 2 })}
                            </Text>
                          </View>
                        ))}
                      </>
                    )}

                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>Totaal:</Text>
                      <Text style={styles.totalValue}>
                        €{quote.total_cost.toLocaleString("nl-BE", { minimumFractionDigits: 2 })}
                      </Text>
                    </View>
                  </View>
                ))}
              </>
            )}

            <View style={styles.footer}>
              <Text>AsbestControl - Vertrouwelijk document</Text>
              <Text>
                {job.title} — Pagina {jobIndex + 2}
              </Text>
            </View>
          </Page>
        );
      })}
    </Document>
  );
}

export async function generateAsbestReport(data: ReportData): Promise<Blob> {
  const blob = await pdf(<AsbestReport {...data} />).toBlob();
  return blob;
}

export function downloadAsbestReport(data: ReportData) {
  generateAsbestReport(data).then((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `asbestrapport-${data.property.address.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}
