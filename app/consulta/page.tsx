"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CONSOLES, FAULTS, FAMILIES, fallbackQuote, familyOf } from "@/lib/catalog";
import { daysLabel, formatMoney } from "@/lib/format";
import type { CatalogItem, Quote } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

type Step = "console" | "fault" | "result";

export default function ConsultaPage() {
  const [step, setStep] = useState<Step>("console");
  const [consoleName, setConsoleName] = useState<string | null>(null);
  const [fault, setFault] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<CatalogItem[] | null>(null);
  const [shop, setShop] = useState({ shop_name: "Doctor Play", phone: "614 121 568", address: "Getafe" });
  const [quote, setQuote] = useState<Quote | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void supabase.rpc("list_catalog").then(({ data, error }) => {
      if (error || !Array.isArray(data)) return;
      setCatalog(data as CatalogItem[]);
    });
    void supabase.rpc("shop_public").then(({ data }) => {
      if (data && typeof data === "object") setShop((current) => ({ ...current, ...(data as typeof current) }));
    });
  }, []);

  useEffect(() => {
    if (step === "console") return;
    const timer = window.setTimeout(() => reset(), 90000);
    return () => window.clearTimeout(timer);
  }, [step, consoleName, fault]);

  const consoles = useMemo(() => {
    if (!catalog?.length) return CONSOLES.map((item) => ({ name: item.name, family: item.family }));
    const seen = new Map<string, string>();
    for (const item of [...catalog].sort((a, b) => a.display_order - b.display_order)) {
      if (!seen.has(item.console)) seen.set(item.console, item.family);
    }
    return [...seen.entries()].map(([name, family]) => ({ name, family }));
  }, [catalog]);

  const faults = useMemo(() => {
    if (!consoleName) return [];
    if (!catalog?.length) return FAULTS.map((item) => item.name);
    return catalog.filter((item) => item.console === consoleName).sort((a, b) => a.fault_order - b.fault_order).map((item) => item.fault);
  }, [catalog, consoleName]);

  function reset() {
    setStep("console");
    setConsoleName(null);
    setFault(null);
    setQuote(null);
  }

  async function chooseFault(nextFault: string) {
    if (!consoleName) return;
    const local = fallbackQuote(consoleName, nextFault);
    setFault(nextFault);
    setQuote(local);
    setStep("result");
    const supabase = createClient();
    const { data, error } = await supabase.rpc("quote_repair", { p_console: consoleName, p_fault: nextFault });
    if (error || !data || typeof data !== "object" || !(data as Quote).found) {
      setQuote(local);
      return;
    }
    setQuote({ ...(data as Quote), live: true });
  }

  async function fullscreen() {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen().catch(() => undefined);
    else await document.exitFullscreen();
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-6xl flex-col px-4 py-5 sm:px-8">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="font-display text-3xl uppercase leading-none">{shop.shop_name}</p>
          <p className="text-sm text-muted">{shop.address}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn btn-ghost" onClick={() => void fullscreen()}>
            Pantalla completa
          </button>
          <Link href="/" className="btn btn-ghost">
            Inicio
          </Link>
        </div>
      </header>

      <p className="mt-6 text-xs font-extrabold tracking-[0.22em] text-cyan">
        {step === "console" ? "01 · CONSOLA" : step === "fault" ? "02 · AVERÍA" : "03 · PRESUPUESTO"}
      </p>

      {step === "console" ? (
        <section className="mt-4">
          <h1 className="font-display text-5xl uppercase leading-none sm:text-7xl">¿Qué consola reparamos?</h1>
          {(["playstation", "nintendo", "xbox"] as const).map((family) => (
            <div key={family} className="mt-8">
              <h2 className="font-display text-2xl uppercase" style={{ color: FAMILIES[family].color }}>
                {FAMILIES[family].label}
              </h2>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {consoles
                  .filter((item) => item.family === family)
                  .map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      className="card min-h-28 px-4 py-5 text-left transition hover:border-white/30"
                      onClick={() => {
                        setConsoleName(item.name);
                        setStep("fault");
                      }}
                    >
                      <span className="font-display text-4xl uppercase leading-none">{item.name}</span>
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </section>
      ) : null}

      {step === "fault" && consoleName ? (
        <section className="mt-4">
          <button type="button" className="text-sm font-bold text-cyan" onClick={() => setStep("console")}>
            ← {consoleName}
          </button>
          <h1 className="mt-3 font-display text-5xl uppercase leading-none sm:text-7xl">¿Qué le pasa?</h1>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {faults.map((item) => (
              <button key={item} type="button" className="card min-h-32 px-5 py-6 text-left" onClick={() => void chooseFault(item)}>
                <span className="font-display text-4xl uppercase leading-none">{item}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {step === "result" && consoleName && fault ? (
        <section className="mt-4 flex flex-1 flex-col">
          <button type="button" className="w-fit text-sm font-bold text-cyan" onClick={() => setStep("fault")}>
            ← Cambiar avería
          </button>
          <p className="mt-4 text-sm font-bold uppercase tracking-[0.18em]" style={{ color: FAMILIES[familyOf(consoleName)].color }}>
            {consoleName} · {fault}
          </p>
          <h1 className="mt-2 font-display text-7xl uppercase leading-none sm:text-8xl">
            {quote?.price != null ? formatMoney(quote.price) : "—"}
          </h1>
          <p className="mt-3 text-2xl text-white/90">{daysLabel(quote?.min_days, quote?.max_days)}</p>
          {quote?.notes ? <p className="mt-4 max-w-2xl text-lg text-muted">{quote.notes}</p> : null}
          <p className="mt-4 max-w-2xl text-sm text-muted">Presupuesto orientativo, IVA incluido. El técnico lo confirma antes de reparar.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button type="button" className="btn btn-magenta" onClick={reset}>
              Nueva consulta
            </button>
            <a className="btn btn-primary" href={`tel:+34${(shop.phone || "").replace(/\D/g, "")}`}>
              Llamar {shop.phone}
            </a>
          </div>
        </section>
      ) : null}
    </main>
  );
}
