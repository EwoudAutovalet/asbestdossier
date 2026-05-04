"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarDays,
  Clock,
  MapPin,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type {
  Profile,
  Property,
  Appointment,
  AppointmentType,
  AppointmentStatus,
} from "@/lib/types";
import {
  APPOINTMENT_TYPE_LABELS,
  APPOINTMENT_STATUS_LABELS,
} from "@/lib/types";

interface PlanningContentProps {
  profile: Profile;
  appointments: (Appointment & { property: Property; specialist: Profile | null; owner: Profile })[];
  specialists: Profile[];
  properties: Property[];
}

const DAYS_NL = ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"];
const MONTHS_NL = [
  "Januari", "Februari", "Maart", "April", "Mei", "Juni",
  "Juli", "Augustus", "September", "Oktober", "November", "December",
];

const TYPE_COLORS: Record<AppointmentType, string> = {
  inspection: "bg-blue-100 border-blue-300 text-blue-800",
  removal: "bg-purple-100 border-purple-300 text-purple-800",
  follow_up: "bg-green-100 border-green-300 text-green-800",
};

function isSameDay(d1: Date, d2: Date) {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}

function getWeekDays(date: Date): Date[] {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date);
  monday.setDate(diff);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }
  return days;
}

function getMonthDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const days: Date[] = [];
  for (let i = -startDay; i < 42 - startDay; i++) {
    const d = new Date(year, month, 1 + i);
    days.push(d);
  }
  return days;
}

export function PlanningContent({ profile, appointments, specialists, properties }: PlanningContentProps) {
  const router = useRouter();
  const supabase = createClient();

  const [view, setView] = useState<"week" | "month">("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<AppointmentType>("inspection");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [newSpecialist, setNewSpecialist] = useState("");
  const [newPropertyId, setNewPropertyId] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const today = new Date();

  const upcomingAppointments = useMemo(
    () => appointments.filter((a) => new Date(a.scheduled_start) >= today && a.status !== "cancelled"),
    [appointments]
  );

  function navigateDate(direction: number) {
    const next = new Date(currentDate);
    if (view === "week") {
      next.setDate(next.getDate() + direction * 7);
    } else {
      next.setMonth(next.getMonth() + direction);
    }
    setCurrentDate(next);
  }

  function getAppointmentsForDay(date: Date) {
    return appointments.filter((a) => isSameDay(new Date(a.scheduled_start), date));
  }

  async function handleCreateAppointment(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle || !newStart || !newEnd || !newPropertyId) return;
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Niet ingelogd");

      const selectedProperty = properties.find((p) => p.id === newPropertyId);
      if (!selectedProperty) throw new Error("Geen pand geselecteerd");

      const ownerId = selectedProperty.owner_id;

      const { error } = await supabase.from("appointments").insert({
        property_id: newPropertyId,
        owner_id: ownerId,
        specialist_id: newSpecialist || null,
        type: newType,
        title: newTitle,
        scheduled_start: new Date(newStart).toISOString(),
        scheduled_end: new Date(newEnd).toISOString(),
        status: "scheduled",
        notes: newNotes || null,
        created_by: user.id,
      });

      if (error) throw error;

      setShowCreate(false);
      setNewTitle("");
      setNewType("inspection");
      setNewStart("");
      setNewEnd("");
      setNewSpecialist("");
      setNewPropertyId("");
      setNewNotes("");
      router.refresh();
    } catch (err) {
      console.error("Create appointment failed:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirm(appointmentId: string) {
    await supabase
      .from("appointments")
      .update({ status: "confirmed" })
      .eq("id", appointmentId);
    router.refresh();
  }

  async function handleCancel(appointmentId: string) {
    await supabase
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", appointmentId);
    router.refresh();
  }

  const weekDays = getWeekDays(currentDate);
  const monthDays = getMonthDays(currentDate.getFullYear(), currentDate.getMonth());

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Planning</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Beheer je afspraken en inspecties
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          Nieuwe afspraak
        </Button>
      </div>

      {/* Upcoming appointments widget */}
      {upcomingAppointments.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              Volgende afspraken
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {upcomingAppointments.slice(0, 3).map((apt) => (
              <div key={apt.id} className="flex items-center gap-3 px-5 py-3 border-t">
                <div className={`w-2 h-2 rounded-full ${
                  apt.type === "inspection" ? "bg-blue-500" :
                  apt.type === "removal" ? "bg-purple-500" : "bg-green-500"
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{apt.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(apt.scheduled_start).toLocaleDateString("nl-BE", {
                      weekday: "short", day: "numeric", month: "short",
                    })} — {new Date(apt.scheduled_start).toLocaleTimeString("nl-BE", {
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </div>
                </div>
                <Badge variant={
                  apt.status === "confirmed" ? "success" :
                  apt.status === "scheduled" ? "info" : "secondary"
                } className="text-[10px]">
                  {APPOINTMENT_STATUS_LABELS[apt.status]}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Calendar navigation */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigateDate(-1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-sm font-bold">
              {view === "week"
                ? `${weekDays[0].getDate()} - ${weekDays[6].getDate()} ${MONTHS_NL[weekDays[0].getMonth()]} ${weekDays[0].getFullYear()}`
                : `${MONTHS_NL[currentDate.getMonth()]} ${currentDate.getFullYear()}`
              }
            </h2>
            <Button variant="ghost" size="icon" onClick={() => navigateDate(1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setCurrentDate(new Date())}
            >
              Vandaag
            </Button>
          </div>
          <div className="flex gap-1">
            <Button
              variant={view === "week" ? "default" : "ghost"}
              size="sm"
              className="text-xs"
              onClick={() => setView("week")}
            >
              Week
            </Button>
            <Button
              variant={view === "month" ? "default" : "ghost"}
              size="sm"
              className="text-xs"
              onClick={() => setView("month")}
            >
              Maand
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {view === "week" ? (
            <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
              {weekDays.map((day) => {
                const isToday = isSameDay(day, today);
                const dayAppointments = getAppointmentsForDay(day);
                return (
                  <div
                    key={day.toISOString()}
                    className={`bg-card min-h-[120px] p-2 ${isToday ? "ring-2 ring-primary ring-inset" : ""}`}
                  >
                    <div className={`text-xs font-bold mb-1 ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                      {DAYS_NL[day.getDay()]} {day.getDate()}
                    </div>
                    <div className="space-y-1">
                      {dayAppointments.map((apt) => (
                        <div
                          key={apt.id}
                          className={`text-[10px] px-1.5 py-1 rounded border truncate cursor-pointer ${TYPE_COLORS[apt.type]}`}
                          title={`${apt.title} - ${new Date(apt.scheduled_start).toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" })}`}
                        >
                          <span className="font-semibold">
                            {new Date(apt.scheduled_start).toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" })}
                          </span>{" "}
                          {apt.title}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-7 mb-1">
                {DAYS_NL.map((d, i) => (
                  <div key={i} className="text-center text-xs font-bold text-muted-foreground py-2">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
                {monthDays.map((day, i) => {
                  const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                  const isToday = isSameDay(day, today);
                  const dayAppointments = getAppointmentsForDay(day);
                  return (
                    <div
                      key={i}
                      className={`bg-card min-h-[80px] p-1.5 ${
                        !isCurrentMonth ? "opacity-40" : ""
                      } ${isToday ? "ring-2 ring-primary ring-inset" : ""}`}
                    >
                      <div className={`text-xs mb-0.5 ${isToday ? "font-bold text-primary" : "text-muted-foreground"}`}>
                        {day.getDate()}
                      </div>
                      {dayAppointments.slice(0, 2).map((apt) => (
                        <div
                          key={apt.id}
                          className={`text-[9px] px-1 py-0.5 rounded border truncate mb-0.5 ${TYPE_COLORS[apt.type]}`}
                        >
                          {apt.title}
                        </div>
                      ))}
                      {dayAppointments.length > 2 && (
                        <div className="text-[9px] text-muted-foreground font-medium">
                          +{dayAppointments.length - 2} meer
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Appointment list below calendar */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            Alle afspraken
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {appointments.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" />
              Nog geen afspraken gepland.
            </div>
          ) : (
            appointments.map((apt) => (
              <div key={apt.id} className="flex items-center gap-4 px-5 py-3 border-t">
                <div className={`w-3 h-3 rounded-full shrink-0 ${
                  apt.type === "inspection" ? "bg-blue-500" :
                  apt.type === "removal" ? "bg-purple-500" : "bg-green-500"
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{apt.title}</div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(apt.scheduled_start).toLocaleDateString("nl-BE", {
                        day: "numeric", month: "short",
                      })} {new Date(apt.scheduled_start).toLocaleTimeString("nl-BE", {
                        hour: "2-digit", minute: "2-digit",
                      })} - {new Date(apt.scheduled_end).toLocaleTimeString("nl-BE", {
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </span>
                    {apt.property && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {apt.property.address}
                      </span>
                    )}
                  </div>
                </div>
                <Badge variant={
                  apt.status === "confirmed" ? "success" :
                  apt.status === "completed" ? "success" :
                  apt.status === "cancelled" ? "destructive" :
                  apt.status === "no_show" ? "destructive" : "info"
                } className="text-[10px] shrink-0">
                  {APPOINTMENT_STATUS_LABELS[apt.status]}
                </Badge>
                {profile.role === "specialist" && apt.status === "scheduled" && (
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleConfirm(apt.id)}>
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Bevestigen
                    </Button>
                    <Button size="sm" variant="ghost" className="text-xs h-7 text-destructive" onClick={() => handleCancel(apt.id)}>
                      Annuleren
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Create appointment dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nieuwe afspraak plannen</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateAppointment} className="space-y-4">
            <div className="space-y-2">
              <Label>Pand <span className="text-destructive">*</span></Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={newPropertyId}
                onChange={(e) => setNewPropertyId(e.target.value)}
                required
              >
                <option value="">Selecteer pand...</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.address}, {p.postal_code} {p.city}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Titel <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Bijv. Inspectie dakbedekking"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={newType}
                onChange={(e) => setNewType(e.target.value as AppointmentType)}
              >
                {(["inspection", "removal", "follow_up"] as AppointmentType[]).map((t) => (
                  <option key={t} value={t}>{APPOINTMENT_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start <span className="text-destructive">*</span></Label>
                <Input
                  type="datetime-local"
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Einde <span className="text-destructive">*</span></Label>
                <Input
                  type="datetime-local"
                  value={newEnd}
                  onChange={(e) => setNewEnd(e.target.value)}
                  required
                />
              </div>
            </div>
            {specialists.length > 0 && (
              <div className="space-y-2">
                <Label>Specialist</Label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={newSpecialist}
                  onChange={(e) => setNewSpecialist(e.target.value)}
                >
                  <option value="">Selecteer specialist...</option>
                  {specialists.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} {s.company_name ? `(${s.company_name})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Notities</Label>
              <Textarea
                placeholder="Optionele notitie..."
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Annuleren
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Opslaan...</>
                ) : (
                  <><Plus className="w-4 h-4 mr-2" />Afspraak plannen</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          Inspectie
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
          Verwijdering
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
          Opvolging
        </span>
      </div>
    </>
  );
}
