"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "@/components/session";
import { Notice, PageTitle } from "@/components/ui";
import { paymentLabel } from "@/lib/catalog";
import { humanError } from "@/lib/errors";
import { asNumber, asOne, formatDate, formatMoney, invoiceCode, madridToday } from "@/lib/format";
import type { Invoice, Repair } from "@/lib/types";

export default function ContabilidadPage() {
  const { supabase } = useSession();
  const [month, setMonth] = useState(madridToday().slice(0, 7));
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [settingsTax, setSettingsTax] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<Invoice | null>(null);
  const [taxDraft, setTaxDraft] = useState("");
  const [making, setMaking] = useState<string | null>(null);

  async function load() {
    const [repairsRes, invoicesRes, settingsRes] = await Promise.all([
      supabase.from("repairs").select("*, client:clients(id, name, phone, tax_id)").order("received_at", { ascending: false }).limit(1000),
      supabase.from("invoices").select("*").order("number", { ascending: false }).limit(400),
      supabase.from("shop_settings").select("tax_id").eq("id", 1).maybeSingle(),
    ]);
    const failure = repairsRes.error || invoicesRes.error || settingsRes.error;
    if (failure) {
      setError(humanError(failure));
      return;
    }
    setRepairs((repairsRes.data as Repair[] | null) ?? []);
    setInvoices((invoicesRes.data as Invoice[] | null) ?? []);
    setSettingsTax((settingsRes.data?.tax_id as string | null) ?? null);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const invoiceByRepair = useMemo(() => {
    const map = new Map<string, Invoice>();
    for (const invoice of invoices) if (invoice.repair_id) map.set(invoice.repair_id, invoice);
    return map;
  }, [invoices]);

  const collected = repairs.filter((repair) => repair.collected_at?.startsWith(month));
  const openWithPrice = repairs.filter((repair) => !repair.collected_at && asNumber(repair.cost) > 0);
  const monthInvoices = invoices.filter((invoice) => invoice.issue_date.startsWith(month));
  const collectedSum = collected.reduce((sum, repair) => sum + asNumber(repair.cost), 0);
  const openSum = openWithPrice.reduce((sum, repair) => sum + asNumber(repair.cost), 0);

  async function makeInvoice(repair: Repair) {
    setMaking(repair.id);
    const person = asOne(repair.client);
    const { data, error: rpcError } = await supabase.rpc("create_invoice_from_repair", {
      p_repair: repair.id,
      p_client_tax_id: taxDraft.trim() || person?.tax_id || null,
    });
    setMaking(null);
    if (rpcError) {
      setError(humanError(rpcError));
      return;
    }
    setTaxDraft("");
    setActive(data as Invoice);
    await load();
  }

  return (
    <div className="grid gap-5">
      <PageTitle
        kicker="CUENTAS"
        title="Contabilidad"
        text="El coste de la reparación es el precio al cliente, IVA incluido. La factura separa base y 21%."
        action={<input type="month" className="field w-auto" value={month} onChange={(event) => setMonth(event.target.value)} />}
      />
      {error ? <Notice tone="bad">{error}</Notice> : null}
      {!settingsTax ? <Notice tone="warn">Añade el NIF del taller en Ajustes antes de conectar Verifactu. Puedes preparar facturas igualmente.</Notice> : null}
      <Notice>
        Verifactu queda preparado: serie, número, NIF, base, IVA y hueco para la huella. La conexión con la Agencia Tributaria llega en una fase siguiente. Estos documentos todavía no se envían.
      </Notice>
      <section className="grid gap-3 sm:grid-cols-3">
        <article className="card p-5">
          <p className="text-xs font-extrabold tracking-[0.16em] text-muted">COBRADO EN EL MES</p>
          <p className="mt-2 font-display text-5xl">{formatMoney(collectedSum)}</p>
        </article>
        <article className="card p-5">
          <p className="text-xs font-extrabold tracking-[0.16em] text-muted">POR COBRAR</p>
          <p className="mt-2 font-display text-5xl">{formatMoney(openSum)}</p>
        </article>
        <article className="card p-5">
          <p className="text-xs font-extrabold tracking-[0.16em] text-muted">FACTURAS DEL MES</p>
          <p className="mt-2 font-display text-5xl">{monthInvoices.length}</p>
        </article>
      </section>

      <section>
        <h2 className="font-display text-3xl uppercase">Recogidas del mes</h2>
        <div className="mt-3 grid gap-2">
          {collected.map((repair) => {
            const person = asOne(repair.client);
            const invoice = invoiceByRepair.get(repair.id);
            return (
              <article key={repair.id} className="card flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-bold">{repair.code} · {person?.name} · {repair.console ?? "Consola"}</p>
                  <p className="text-sm text-muted">{formatDate(repair.collected_at)} · {formatMoney(repair.cost)} · {paymentLabel(repair.payment_method)}</p>
                </div>
                {invoice ? (
                  <button type="button" className="btn btn-ghost" onClick={() => setActive(invoice)}>{invoiceCode(invoice.series, invoice.number)}</button>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <input className="field w-36" placeholder="NIF cliente" value={making === repair.id ? taxDraft : ""} onChange={(event) => { setMaking(repair.id); setTaxDraft(event.target.value); }} />
                    <button type="button" className="btn btn-primary" onClick={() => void makeInvoice(repair)}>Crear factura</button>
                  </div>
                )}
              </article>
            );
          })}
          {collected.length === 0 ? <p className="text-muted">Este mes todavía no hay recogidas.</p> : null}
        </div>
      </section>

      <section>
        <h2 className="font-display text-3xl uppercase">En el taller, con precio</h2>
        <div className="mt-3 grid gap-2">
          {openWithPrice.map((repair) => {
            const person = asOne(repair.client);
            return (
              <article key={repair.id} className="card px-4 py-3">
                <p className="font-bold">{repair.code} · {person?.name} · {formatMoney(repair.cost)}</p>
                <p className="text-sm text-muted">{repair.console ?? "Consola"} · recibida {formatDate(repair.received_at)}</p>
              </article>
            );
          })}
          {openWithPrice.length === 0 ? <p className="text-muted">No hay importes pendientes de cobro.</p> : null}
        </div>
      </section>

      {active ? (
        <section className="print-sheet card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold tracking-[0.18em]">FACTURA {invoiceCode(active.series, active.number)}</p>
              <h2 className="font-display text-4xl uppercase">{active.issuer_name ?? "Doctor Play"}</h2>
              <p>NIF emisor: {active.issuer_tax_id ?? "Pendiente"}</p>
            </div>
            <p>{formatDate(active.issue_date)}</p>
          </div>
          <div className="mt-5">
            <p className="font-bold">{active.client_name}</p>
            <p>NIF cliente: {active.client_tax_id ?? "No indicado"}</p>
            <p className="mt-3">{active.description}</p>
          </div>
          <dl className="mt-5 grid max-w-sm gap-1">
            <div className="flex justify-between"><dt>Base</dt><dd>{formatMoney(active.base_amount)}</dd></div>
            <div className="flex justify-between"><dt>IVA {asNumber(active.tax_rate)}%</dt><dd>{formatMoney(active.tax_amount)}</dd></div>
            <div className="flex justify-between text-xl font-bold"><dt>Total</dt><dd>{formatMoney(active.total)}</dd></div>
          </dl>
          <p className="mt-5 text-sm">Verifactu: {active.verifactu_status === "no_conectada" ? "pendiente de conectar" : active.verifactu_status}. Huella: {active.invoice_hash ?? "—"}</p>
          <p className="mt-2 text-xs">Documento interno. No es un envío a la AEAT hasta que se conecte Verifactu.</p>
          <div className="no-print mt-5 flex gap-2">
            <button type="button" className="btn btn-primary" onClick={() => window.print()}>Imprimir</button>
            <button type="button" className="btn btn-ghost" onClick={() => setActive(null)}>Cerrar</button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
