"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Pipeline, StatusPill } from "@/components/pipeline";
import { useSession } from "@/components/session";
import { Empty, Notice, PageTitle } from "@/components/ui";
import { FAMILIES, PAYMENTS, familyOf, paymentLabel } from "@/lib/catalog";
import { humanError } from "@/lib/errors";
import { asOne, formatMoney, madridToday, shiftDays, startOfWeek } from "@/lib/format";
import type { Repair } from "@/lib/types";

type Tri = "all" | "yes" | "no";
type Range = "all" | "today" | "week" | "month";

const PRESETS: { id: string; label: string; repaired: Tri; informed: Tri; collected: Tri }[] = [
  { id: "abiertas", label: "En taller", repaired: "all", informed: "all", collected: "no" },
  { id: "reparar", label: "Por reparar", repaired: "no", informed: "all", collected: "all" },
  { id: "informar", label: "Por informar", repaired: "yes", informed: "no", collected: "all" },
  { id: "recoger", label: "Por recoger", repaired: "all", informed: "yes", collected: "no" },
  { id: "recogidas", label: "Recogidas", repaired: "all", informed: "all", collected: "yes" },
  { id: "todas", label: "Todas", repaired: "all", informed: "all", collected: "all" },
];

function hasDate(value: string | null, mode: Tri) {
  if (mode === "all") return true;
  return mode === "yes" ? Boolean(value) : !value;
}

export default function ReparacionesPage() {
  const { supabase } = useSession();
  const [rows, setRows] = useState<Repair[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [range, setRange] = useState<Range>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [repaired, setRepaired] = useState<Tri>("all");
  const [informed, setInformed] = useState<Tri>("all");
  const [collected, setCollected] = useState<Tri>("no");
  const [collectingId, setCollectingId] = useState<string | null>(null);

  async function load() {
    const { data, error: loadError } = await supabase
      .from("repairs")
      .select("*, client:clients(id, name, phone, tax_id)")
      .order("received_at", { ascending: false })
      .limit(500);
    if (loadError) {
      setError(humanError(loadError));
      return;
    }
    setRows((data as Repair[] | null) ?? []);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function stamp(repair: Repair, field: "repaired_at" | "informed_at" | "collected_at", payment?: string) {
    const today = madridToday();
    const patch: Record<string, string> = { [field]: today };
    if (field === "informed_at" && !repair.repaired_at) patch.repaired_at = today;
    if (field === "collected_at") {
      if (!repair.informed_at) patch.informed_at = today;
      if (!repair.repaired_at) patch.repaired_at = today;
      if (payment) patch.payment_method = payment;
    }
    const { error: updateError } = await supabase.from("repairs").update(patch).eq("id", repair.id);
    if (updateError) {
      setError(humanError(updateError));
      return;
    }
    setCollectingId(null);
    await load();
  }

  const today = madridToday();
  const filtered = useMemo(() => {
    const week = startOfWeek(today);
    const month = today.slice(0, 7);
    const text = query.trim().toLowerCase();
    return rows
      .filter((repair) => {
        const person = asOne(repair.client);
        const haystack = `${person?.name ?? ""} ${person?.phone ?? ""} ${repair.code ?? ""} ${repair.detail ?? ""} ${repair.console ?? ""}`.toLowerCase();
        if (text && !haystack.includes(text)) return false;
        if (from && repair.received_at < from) return false;
        if (to && repair.received_at > to) return false;
        if (range === "today" && repair.received_at !== today) return false;
        if (range === "week" && (repair.received_at < week || repair.received_at > shiftDays(week, 6))) return false;
        if (range === "month" && !repair.received_at.startsWith(month)) return false;
        if (!hasDate(repair.repaired_at, repaired)) return false;
        if (!hasDate(repair.informed_at, informed)) return false;
        if (!hasDate(repair.collected_at, collected)) return false;
        return true;
      })
      .sort((a, b) => (collected === "yes" ? b.received_at.localeCompare(a.received_at) : a.received_at.localeCompare(b.received_at)));
  }, [rows, query, from, to, range, today, repaired, informed, collected]);

  function applyPreset(preset: (typeof PRESETS)[number]) {
    setRepaired(preset.repaired);
    setInformed(preset.informed);
    setCollected(preset.collected);
  }

  const current = PRESETS.find((preset) => preset.repaired === repaired && preset.informed === informed && preset.collected === collected);

  return (
    <div>
      <PageTitle
        kicker="TALLER"
        title="Reparaciones"
        text="La más antigua queda arriba mientras sigue en el taller."
        action={<Link href="/panel/reparaciones/nueva" className="btn btn-primary">Nueva reparación</Link>}
      />
      {error ? <div className="mb-4"><Notice tone="bad">{error}</Notice></div> : null}
      <div className="mb-4 flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button key={preset.id} type="button" className="chip" data-on={current?.id === preset.id} onClick={() => applyPreset(preset)}>
            {preset.label}
          </button>
        ))}
      </div>
      <div className="card mb-4 grid gap-3 p-4 lg:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))]">
        <input className="field" placeholder="Nombre, teléfono, código o detalle" value={query} onChange={(event) => setQuery(event.target.value)} />
        <select className="field" value={range} onChange={(event) => setRange(event.target.value as Range)}>
          <option value="all">Todas las fechas</option>
          <option value="today">Recibidas hoy</option>
          <option value="week">Esta semana</option>
          <option value="month">Este mes</option>
        </select>
        <input className="field" type="date" value={from} onChange={(event) => setFrom(event.target.value)} aria-label="Desde" />
        <input className="field" type="date" value={to} onChange={(event) => setTo(event.target.value)} aria-label="Hasta" />
        <p className="grid place-items-center text-sm font-bold text-muted">{filtered.length} reparaciones</p>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <TriFilter label="Reparado" value={repaired} onChange={setRepaired} />
        <TriFilter label="Informado" value={informed} onChange={setInformed} />
        <TriFilter label="Recogido" value={collected} onChange={setCollected} />
      </div>
      {filtered.length === 0 ? (
        <Empty title="Nada con estos filtros" text="Prueba con En taller o crea una recepción nueva." action={<Link className="btn btn-primary" href="/panel/reparaciones/nueva">Nueva reparación</Link>} />
      ) : (
        <div className="grid gap-3">
          {filtered.map((repair) => {
            const person = asOne(repair.client);
            const color = FAMILIES[familyOf(repair.console)].color;
            return (
              <article key={repair.id} className="card p-4" style={{ boxShadow: `inset 4px 0 0 ${color}` }}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color }}>{repair.console ?? "Sin consola"}{repair.fault ? ` · ${repair.fault}` : ""}</p>
                    <Link href={`/panel/reparaciones/${repair.id}`} className="font-display text-3xl uppercase leading-none">
                      {person?.name ?? "Cliente"} <span className="text-muted">{repair.code}</span>
                    </Link>
                    <p className="mt-1 text-sm text-muted">{person?.phone} · {formatMoney(repair.cost)} · {paymentLabel(repair.payment_method)}</p>
                  </div>
                  <StatusPill repair={repair} />
                </div>
                {repair.detail ? <p className="mt-3 text-sm text-white/80">{repair.detail}</p> : null}
                <div className="mt-4">
                  <Pipeline repair={repair} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {!repair.repaired_at ? <button type="button" className="btn btn-ghost" onClick={() => void stamp(repair, "repaired_at")}>Reparado hoy</button> : null}
                  {!repair.informed_at ? <button type="button" className="btn btn-ghost" onClick={() => void stamp(repair, "informed_at")}>Informado hoy</button> : null}
                  {!repair.collected_at ? <button type="button" className="btn btn-lime" onClick={() => setCollectingId(collectingId === repair.id ? null : repair.id)}>Recogido</button> : null}
                  <Link href={`/panel/reparaciones/${repair.id}`} className="btn btn-ghost">Abrir</Link>
                </div>
                {collectingId === repair.id ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {PAYMENTS.map((item) => (
                      <button key={item.id} type="button" className="chip" onClick={() => void stamp(repair, "collected_at", item.id)}>{item.label}</button>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TriFilter({ label, value, onChange }: { label: string; value: Tri; onChange: (value: Tri) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-white/10 p-1">
      <span className="px-2 text-xs font-extrabold uppercase tracking-wider text-muted">{label}</span>
      {(["all", "yes", "no"] as Tri[]).map((item) => (
        <button key={item} type="button" className="chip !min-h-9" data-on={value === item} onClick={() => onChange(item)}>
          {item === "all" ? "Todos" : item === "yes" ? "Sí" : "No"}
        </button>
      ))}
    </div>
  );
}
