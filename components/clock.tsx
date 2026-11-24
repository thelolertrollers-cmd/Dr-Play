"use client";

import { useEffect, useState } from "react";
import { humanError } from "@/lib/errors";
import { useSession } from "@/components/session";
import { cn, formatDuration, formatTime } from "@/lib/format";

export function ClockButton({ large = false }: { large?: boolean }) {
  const { supabase } = useSession();
  const [openAt, setOpenAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmOut, setConfirmOut] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  async function loadShift() {
    const { data, error } = await supabase
      .from("time_entries")
      .select("clock_in")
      .is("clock_out", null)
      .maybeSingle();
    if (error) {
      setMessage(humanError(error));
      return;
    }
    setOpenAt((data?.clock_in as string | undefined) ?? null);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadShift();
    }, 0);
    const onChange = () => void loadShift();
    window.addEventListener("fichaje-changed", onChange);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("fichaje-changed", onChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!openAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, [openAt]);

  useEffect(() => {
    if (!confirmOut) return;
    const timer = window.setTimeout(() => setConfirmOut(false), 4000);
    return () => window.clearTimeout(timer);
  }, [confirmOut]);

  async function clockIn() {
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.rpc("clock_in");
    setBusy(false);
    if (error) {
      setMessage(humanError(error));
      return;
    }
    window.dispatchEvent(new Event("fichaje-changed"));
  }

  async function clockOut() {
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.rpc("clock_out");
    setBusy(false);
    setConfirmOut(false);
    if (error) {
      setMessage(humanError(error));
      return;
    }
    window.dispatchEvent(new Event("fichaje-changed"));
  }

  const elapsed = openAt ? formatDuration(now - new Date(openAt).getTime()) : null;

  if (!large) {
    return (
      <div>
        <button
          type="button"
          className={cn("btn w-full", openAt ? "btn-magenta" : "btn-lime")}
          disabled={busy}
          onClick={() => (openAt ? (confirmOut ? void clockOut() : setConfirmOut(true)) : void clockIn())}
        >
          {openAt ? (confirmOut ? "Confirmar salida" : `En jornada · ${elapsed}`) : "Fichar entrada"}
        </button>
        {openAt ? <p className="mt-2 text-center text-xs text-muted">Entrada {formatTime(openAt)}</p> : null}
        {message ? <p className="mt-2 text-center text-xs text-magenta">{message}</p> : null}
      </div>
    );
  }

  return (
    <section className="card p-6">
      <p className="text-xs font-extrabold tracking-[0.2em] text-muted">REGISTRO DE JORNADA</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-display text-5xl uppercase">{openAt ? "En jornada" : "Fuera"}</p>
          <p className="mt-1 text-muted">
            {openAt ? `Entrada a las ${formatTime(openAt)} · ${elapsed}` : "La hora la marca el sistema al pulsar."}
          </p>
        </div>
        <button
          type="button"
          className={cn("btn min-w-52", openAt ? "btn-magenta" : "btn-lime")}
          disabled={busy}
          onClick={() => (openAt ? (confirmOut ? void clockOut() : setConfirmOut(true)) : void clockIn())}
        >
          {busy ? "Guardando…" : openAt ? (confirmOut ? "Confirmar salida" : "Fichar salida") : "Fichar entrada"}
        </button>
      </div>
      {message ? <p className="mt-3 text-sm font-semibold text-magenta">{message}</p> : null}
    </section>
  );
}
