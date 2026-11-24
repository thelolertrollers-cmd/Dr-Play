"use client";

import { useEffect, useMemo, useState } from "react";
import { ClockButton } from "@/components/clock";
import { useSession } from "@/components/session";
import { Label, Notice, PageTitle } from "@/components/ui";
import { humanError } from "@/lib/errors";
import { durationMs, formatDate, formatDuration, formatTime, madridDate, madridToday, toLocalInput } from "@/lib/format";
import type { Profile, TimeEntry } from "@/lib/types";

export default function FichajesPage() {
  const { supabase, profile, reload } = useSession();
  const [name, setName] = useState(profile.full_name);
  const [mine, setMine] = useState<TimeEntry[]>([]);
  const [company, setCompany] = useState<TimeEntry[]>([]);
  const [people, setPeople] = useState<Profile[]>([]);
  const [day, setDay] = useState(madridToday());
  const [editing, setEditing] = useState<TimeEntry | null>(null);
  const [clockIn, setClockIn] = useState("");
  const [clockOut, setClockOut] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const since = new Date();
    since.setDate(since.getDate() - 31);
    const mineRes = await supabase
      .from("time_entries")
      .select("*")
      .eq("employee_id", profile.id)
      .gte("clock_in", since.toISOString())
      .order("clock_in", { ascending: false });
    if (mineRes.error) {
      setError(humanError(mineRes.error));
      return;
    }
    setMine((mineRes.data as TimeEntry[] | null) ?? []);

    if (profile.role !== "admin") return;
    const start = new Date(`${day}T00:00:00`);
    start.setDate(start.getDate() - 1);
    const end = new Date(`${day}T00:00:00`);
    end.setDate(end.getDate() + 2);
    const [companyRes, peopleRes] = await Promise.all([
      supabase.from("time_entries").select("*").gte("clock_in", start.toISOString()).lte("clock_in", end.toISOString()).order("clock_in"),
      supabase.from("profiles").select("id, full_name, role, active, created_at").order("full_name"),
    ]);
    if (companyRes.error || peopleRes.error) {
      setError(humanError(companyRes.error ?? peopleRes.error));
      return;
    }
    setCompany((companyRes.data as TimeEntry[] | null) ?? []);
    setPeople((peopleRes.data as Profile[] | null) ?? []);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    const onChange = () => void load();
    window.addEventListener("fichaje-changed", onChange);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("fichaje-changed", onChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, profile.id, profile.role]);

  const dayRows = useMemo(
    () => company.filter((entry) => madridDate(entry.clock_in) === day),
    [company, day],
  );

  async function saveName() {
    const { error: updateError } = await supabase.rpc("update_my_name", { p_name: name });
    if (updateError) {
      setError(humanError(updateError));
      return;
    }
    setMessage("Nombre actualizado.");
    await reload();
  }

  function openEdit(entry: TimeEntry) {
    setEditing(entry);
    setClockIn(toLocalInput(entry.clock_in));
    setClockOut(entry.clock_out ? toLocalInput(entry.clock_out) : "");
    setNote("");
  }

  async function saveCorrection(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    const { error: updateError } = await supabase.rpc("correct_time_entry", {
      p_id: editing.id,
      p_clock_in: new Date(clockIn).toISOString(),
      p_clock_out: new Date(clockOut).toISOString(),
      p_note: note,
    });
    if (updateError) {
      setError(humanError(updateError));
      return;
    }
    setEditing(null);
    setMessage("Corrección guardada. La hora original se conserva.");
    await load();
  }

  function exportCsv() {
    const names = new Map(people.map((person) => [person.id, person.full_name]));
    const lines = [
      ["Empleado", "Fecha", "Entrada", "Salida", "Horas", "Corrección"],
      ...dayRows.map((entry) => [
        names.get(entry.employee_id) ?? "Empleado",
        madridDate(entry.clock_in),
        formatTime(entry.clock_in),
        entry.clock_out ? formatTime(entry.clock_out) : "",
        entry.clock_out ? formatDuration(durationMs(entry.clock_in, entry.clock_out)) : "En curso",
        entry.correction_note ?? "",
      ]),
    ];
    const csv = `\uFEFF${lines.map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";")).join("\n")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `fichajes-${day}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const names = new Map(people.map((person) => [person.id, person.full_name]));
  const closedMs = dayRows.reduce((sum, entry) => sum + (entry.clock_out ? durationMs(entry.clock_in, entry.clock_out) : 0), 0);

  return (
    <div className="grid gap-5">
      <PageTitle
        kicker="JORNADA"
        title="Fichajes"
        text="La entrada y la salida las marca el sistema. Si hay un error, administración lo corrige y queda el motivo y la hora original."
      />
      {error ? <Notice tone="bad">{error}</Notice> : null}
      {message ? <Notice tone="good">{message}</Notice> : null}
      <ClockButton large />
      <section className="card grid gap-3 p-5 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <Label htmlFor="mi-nombre">Tu nombre en los fichajes</Label>
          <input id="mi-nombre" className="field" value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <button type="button" className="btn btn-ghost" onClick={() => void saveName()}>Guardar nombre</button>
      </section>
      <section>
        <h2 className="font-display text-3xl uppercase">Tus últimos 30 días</h2>
        <div className="mt-3 grid gap-2">
          {mine.map((entry) => (
            <article key={entry.id} className="card flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="font-bold">{formatDate(madridDate(entry.clock_in))}</p>
                <p className="text-sm text-muted">
                  {formatTime(entry.clock_in)} – {entry.clock_out ? formatTime(entry.clock_out) : "en curso"}
                  {entry.clock_out ? ` · ${formatDuration(durationMs(entry.clock_in, entry.clock_out))}` : ""}
                </p>
                {entry.correction_note ? <p className="text-xs text-amber">Corregido: {entry.correction_note}</p> : null}
              </div>
            </article>
          ))}
          {mine.length === 0 ? <p className="text-muted">Todavía no hay fichajes tuyos.</p> : null}
        </div>
      </section>
      {profile.role === "admin" ? (
        <section className="grid gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-3xl uppercase">Registro de la empresa</h2>
              <p className="text-sm text-muted">{formatDuration(closedMs)} cerradas el {formatDate(day)}</p>
            </div>
            <div className="flex gap-2">
              <input type="date" className="field" value={day} onChange={(event) => setDay(event.target.value)} />
              <button type="button" className="btn btn-ghost" onClick={exportCsv}>CSV</button>
            </div>
          </div>
          <div className="grid gap-2">
            {dayRows.map((entry) => (
              <article key={entry.id} className="card flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-bold">{names.get(entry.employee_id) ?? "Empleado"}</p>
                  <p className="text-sm text-muted">
                    {formatTime(entry.clock_in)} – {entry.clock_out ? formatTime(entry.clock_out) : "en curso"}
                    {entry.clock_out ? ` · ${formatDuration(durationMs(entry.clock_in, entry.clock_out))}` : ""}
                  </p>
                  {entry.original_clock_in ? (
                    <p className="text-xs text-amber">
                      Original {formatTime(entry.original_clock_in)} – {entry.original_clock_out ? formatTime(entry.original_clock_out) : "abierta"}. {entry.correction_note}
                    </p>
                  ) : null}
                </div>
                <button type="button" className="btn btn-ghost" onClick={() => openEdit(entry)}>Corregir</button>
              </article>
            ))}
            {dayRows.length === 0 ? <p className="text-muted">Nadie ha fichado este día.</p> : null}
          </div>
          {editing ? (
            <form onSubmit={(event) => void saveCorrection(event)} className="card grid gap-3 p-5">
              <h3 className="font-display text-2xl uppercase">Corregir fichaje</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="entrada">Entrada</Label>
                  <input id="entrada" type="datetime-local" className="field" value={clockIn} onChange={(event) => setClockIn(event.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="salida">Salida</Label>
                  <input id="salida" type="datetime-local" className="field" value={clockOut} onChange={(event) => setClockOut(event.target.value)} required />
                </div>
              </div>
              <div>
                <Label htmlFor="motivo">Motivo</Label>
                <textarea id="motivo" className="field" value={note} onChange={(event) => setNote(event.target.value)} required minLength={3} placeholder="Por ejemplo: olvidó fichar la salida" />
              </div>
              <div className="flex gap-2">
                <button className="btn btn-primary">Guardar corrección</button>
                <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>Cancelar</button>
              </div>
            </form>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
