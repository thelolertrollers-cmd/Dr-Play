"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ClockButton } from "@/components/clock";
import { useSession } from "@/components/session";
import { StatusPill } from "@/components/pipeline";
import { humanError } from "@/lib/errors";
import { asNumber, asOne, formatMoney, madridToday } from "@/lib/format";
import type { Repair } from "@/lib/types";
import { Notice } from "@/components/ui";

export default function DashboardPage() {
  const { supabase, profile } = useSession();
  const [open, setOpen] = useState<Repair[]>([]);
  const [monthTotal, setMonthTotal] = useState(0);
  const [todayMoney, setTodayMoney] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const today = madridToday();
  const monthStart = `${today.slice(0, 7)}-01`;

  useEffect(() => {
    let alive = true;
    async function load() {
      const [openRes, moneyRes, countRes] = await Promise.all([
        supabase
          .from("repairs")
          .select("id, code, console, fault, cost, received_at, repaired_at, informed_at, collected_at, client:clients(name, phone)")
          .is("collected_at", null)
          .order("received_at", { ascending: true }),
        supabase.from("repairs").select("cost, collected_at").gte("collected_at", monthStart).lte("collected_at", today),
        supabase.from("repairs").select("id", { count: "exact", head: true }),
      ]);
      if (!alive) return;
      const failure = openRes.error || moneyRes.error || countRes.error;
      if (failure) {
        setError(humanError(failure));
        return;
      }
      setOpen((openRes.data as Repair[] | null) ?? []);
      const money = (moneyRes.data as { cost: number | string | null; collected_at: string }[] | null) ?? [];
      setMonthTotal(money.reduce((sum, row) => sum + asNumber(row.cost), 0));
      setTodayMoney(money.filter((row) => row.collected_at === today).reduce((sum, row) => sum + asNumber(row.cost), 0));
      setTotal(countRes.count ?? 0);
    }
    void load();
    return () => {
      alive = false;
    };
  }, [supabase, monthStart, today]);

  const waitingRepair = open.filter((item) => !item.repaired_at).length;
  const waitingInfo = open.filter((item) => item.repaired_at && !item.informed_at).length;
  const waitingPickup = open.filter((item) => item.informed_at && !item.collected_at).length;

  return (
    <div className="grid gap-5">
      <div>
        <p className="text-xs font-extrabold tracking-[0.22em] text-cyan">HOY EN EL TALLER</p>
        <h1 className="font-display text-5xl uppercase leading-none">Hola, {profile.full_name.split(" ")[0]}</h1>
      </div>
      {error ? <Notice tone="bad">{error}</Notice> : null}
      <ClockButton large />
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="card p-5">
          <p className="text-xs font-extrabold tracking-[0.16em] text-muted">EN TALLER</p>
          <p className="mt-2 font-display text-6xl">{open.length}</p>
        </article>
        <article className="card p-5">
          <p className="text-xs font-extrabold tracking-[0.16em] text-muted">POR REPARAR</p>
          <p className="mt-2 font-display text-6xl text-amber">{waitingRepair}</p>
        </article>
        <article className="card p-5">
          <p className="text-xs font-extrabold tracking-[0.16em] text-muted">POR INFORMAR</p>
          <p className="mt-2 font-display text-6xl text-magenta">{waitingInfo}</p>
        </article>
        <article className="card p-5">
          <p className="text-xs font-extrabold tracking-[0.16em] text-muted">POR RECOGER</p>
          <p className="mt-2 font-display text-6xl text-lime">{waitingPickup}</p>
        </article>
      </section>
      <section className="grid gap-3 lg:grid-cols-[1.2fr_.8fr]">
        <article className="card p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-3xl uppercase">Las más antiguas</h2>
            <Link href="/panel/reparaciones/nueva" className="btn btn-primary">
              Nueva
            </Link>
          </div>
          <div className="mt-4 grid gap-3">
            {open.slice(0, 6).map((repair) => {
              const person = asOne(repair.client);
              return (
                <Link key={repair.id} href={`/panel/reparaciones/${repair.id}`} className="rounded-2xl bg-white/5 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-bold">
                      {repair.code} · {person?.name ?? "Cliente"} · {repair.console ?? "Consola"}
                    </p>
                    <StatusPill repair={repair} />
                  </div>
                  <p className="text-sm text-muted">
                    {person?.phone} · recibida {repair.received_at.split("-").reverse().join("/")}
                  </p>
                </Link>
              );
            })}
            {open.length === 0 ? <p className="text-muted">No hay consolas esperando. Buen momento para una recepción.</p> : null}
          </div>
        </article>
        <article className="card p-5">
          <p className="text-xs font-extrabold tracking-[0.16em] text-muted">COBRADO</p>
          <p className="mt-2 font-display text-5xl">{formatMoney(todayMoney)}</p>
          <p className="text-muted">hoy</p>
          <p className="mt-4 font-display text-4xl">{formatMoney(monthTotal)}</p>
          <p className="text-muted">este mes, al recoger</p>
          {profile.role === "admin" && total === 0 ? (
            <div className="mt-6 grid gap-2 text-sm">
              <p className="font-bold">Primeros pasos</p>
              <Link className="text-cyan" href="/panel/admin">Revisar precios, cola y código de empleados</Link>
              <Link className="text-cyan" href="/consulta">Abrir la consulta en la tablet</Link>
              <Link className="text-cyan" href="/panel/reparaciones/nueva">Apuntar la primera reparación</Link>
            </div>
          ) : null}
        </article>
      </section>
    </div>
  );
}
