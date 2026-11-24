"use client";

import { useEffect, useState } from "react";
import { DEVICES, FAULTS, PAYMENTS, familyOf, FAMILIES } from "@/lib/catalog";
import { humanError } from "@/lib/errors";
import { asNumber, daysLabel, formatMoney, madridToday } from "@/lib/format";
import type { ClientBrief, Quote, Repair } from "@/lib/types";
import { useSession } from "@/components/session";
import { Label, Notice } from "@/components/ui";

type Props = {
  repair?: Repair | null;
  onSaved: (id: string) => void;
};

export function RepairForm({ repair, onSaved }: Props) {
  const { supabase } = useSession();
  const client = Array.isArray(repair?.client) ? repair?.client[0] : repair?.client;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ClientBrief[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(repair?.client_id ?? null);
  const [name, setName] = useState(client?.name ?? "");
  const [phone, setPhone] = useState(client?.phone ?? "");
  const [taxId, setTaxId] = useState(client?.tax_id ?? "");
  const [consoleName, setConsoleName] = useState(repair?.console ?? "");
  const [serial, setSerial] = useState(repair?.serial_number ?? "");
  const [fault, setFault] = useState(repair?.fault ?? "");
  const [detail, setDetail] = useState(repair?.detail ?? "");
  const [cost, setCost] = useState(repair?.cost == null ? "" : String(repair.cost));
  const [received, setReceived] = useState(repair?.received_at ?? madridToday());
  const [repaired, setRepaired] = useState(repair?.repaired_at ?? "");
  const [informed, setInformed] = useState(repair?.informed_at ?? "");
  const [collected, setCollected] = useState(repair?.collected_at ?? "");
  const [payment, setPayment] = useState(repair?.payment_method ?? "");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (repair) return;
    const text = query.trim();
    if (text.length < 2) return;
    const timer = window.setTimeout(() => {
      const safe = text.replace(/[%_,.()]/g, "");
      void supabase
        .from("clients")
        .select("id, name, phone, tax_id")
        .or(`name.ilike.%${safe}%,phone.ilike.%${safe}%`)
        .limit(6)
        .then(({ data }) => setResults((data as ClientBrief[] | null) ?? []));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query, repair, supabase]);

  useEffect(() => {
    if (!consoleName || !fault) return;
    const timer = window.setTimeout(() => {
      void supabase.rpc("quote_repair", { p_console: consoleName, p_fault: fault }).then(({ data }) => {
        if (data && typeof data === "object") setQuote(data as Quote);
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [consoleName, fault, supabase]);

  function pickClient(item: ClientBrief) {
    setSelectedId(item.id);
    setName(item.name);
    setPhone(item.phone);
    setTaxId(item.tax_id ?? "");
    setResults([]);
    setQuery("");
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      if (!name.trim() || !phone.trim()) throw new Error("Escribe el cliente y el teléfono.");
      if (!received) throw new Error("Falta la fecha de recepción.");
      const parsedCost = cost.trim() === "" ? null : Number(cost.replace(",", "."));
      if (parsedCost !== null && Number.isNaN(parsedCost)) throw new Error("El coste no es un número.");

      let clientId = selectedId;
      if (!clientId) {
        const { data: existing } = await supabase.from("clients").select("id").eq("phone", phone.trim()).maybeSingle();
        if (existing?.id) {
          clientId = existing.id as string;
          const { error: updateError } = await supabase
            .from("clients")
            .update({ name: name.trim(), tax_id: taxId.trim() || null })
            .eq("id", clientId);
          if (updateError) throw updateError;
        } else {
          const { data, error: insertError } = await supabase
            .from("clients")
            .insert({ name: name.trim(), phone: phone.trim(), tax_id: taxId.trim() || null })
            .select("id")
            .single();
          if (insertError) throw insertError;
          clientId = data.id as string;
        }
      } else {
        const { error: updateError } = await supabase
          .from("clients")
          .update({ name: name.trim(), phone: phone.trim(), tax_id: taxId.trim() || null })
          .eq("id", clientId);
        if (updateError) throw updateError;
      }

      const payload = {
        client_id: clientId,
        console: consoleName || null,
        serial_number: serial.trim() || null,
        fault: fault || null,
        detail: detail.trim() || null,
        cost: parsedCost,
        received_at: received,
        repaired_at: repaired || null,
        informed_at: informed || null,
        collected_at: collected || null,
        payment_method: payment || null,
      };

      if (repair) {
        const { error: updateError } = await supabase.from("repairs").update(payload).eq("id", repair.id);
        if (updateError) throw updateError;
        onSaved(repair.id);
      } else {
        const { data, error: insertError } = await supabase.from("repairs").insert(payload).select("id").single();
        if (insertError) throw insertError;
        onSaved(data.id as string);
      }
    } catch (reason) {
      setError(humanError(reason));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-5">
      <section className="card p-5">
        <h2 className="font-display text-3xl uppercase">Cliente</h2>
        {repair ? null : (
          <div className="mt-4">
            <Label htmlFor="buscar">Buscar ficha</Label>
            <input
              id="buscar"
              className="field"
              placeholder="Nombre o teléfono"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSelectedId(null);
              }}
            />
            {results.length > 0 ? (
              <div className="mt-2 grid gap-2">
                {results.map((item) => (
                  <button key={item.id} type="button" className="card px-4 py-3 text-left" onClick={() => pickClient(item)}>
                    <span className="font-bold">{item.name}</span>
                    <span className="ml-2 text-muted">{item.phone}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        )}
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="cliente">Cliente</Label>
            <input id="cliente" className="field" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div>
            <Label htmlFor="telefono">Teléfono</Label>
            <input id="telefono" className="field" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
          </div>
          <div>
            <Label htmlFor="nif">NIF</Label>
            <input id="nif" className="field" value={taxId ?? ""} onChange={(event) => setTaxId(event.target.value)} placeholder="Opcional" />
          </div>
        </div>
        {selectedId ? <p className="mt-3 text-sm text-cyan">Cliente ya registrado.</p> : null}
      </section>

      <section className="card p-5">
        <h2 className="font-display text-3xl uppercase">Dispositivo</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {DEVICES.map((item) => (
            <button
              key={item.name}
              type="button"
              className="chip"
              data-on={consoleName === item.name}
              style={consoleName === item.name ? { background: FAMILIES[familyOf(item.name)].color, color: "#071018" } : undefined}
              onClick={() => setConsoleName(consoleName === item.name ? "" : item.name)}
            >
              {item.name}
            </button>
          ))}
        </div>
        <div className="mt-4 max-w-md">
          <Label htmlFor="serie">Número de serie</Label>
          <input id="serie" className="field" value={serial} onChange={(event) => setSerial(event.target.value)} autoComplete="off" />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {FAULTS.map((item) => (
            <button
              key={item.name}
              type="button"
              className="chip"
              data-on={fault === item.name}
              onClick={() => setFault(fault === item.name ? "" : item.name)}
            >
              {item.name}
            </button>
          ))}
        </div>
        {quote?.found && quote.price != null ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/5 px-4 py-3">
            <p>
              Guía: <strong>{formatMoney(quote.price)}</strong> · {daysLabel(quote.min_days, quote.max_days)}
            </p>
            <button type="button" className="btn btn-ghost" onClick={() => setCost(String(asNumber(quote.price)))}>
              Usar este precio
            </button>
          </div>
        ) : null}
      </section>

      <section className="card p-5">
        <h2 className="font-display text-3xl uppercase">Reparación</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="recibido">Fecha recibir</Label>
            <input id="recibido" type="date" className="field" value={received} onChange={(event) => setReceived(event.target.value)} />
          </div>
          <div>
            <Label htmlFor="coste">Coste rep.</Label>
            <input id="coste" className="field" inputMode="decimal" placeholder="IVA incluido" value={cost} onChange={(event) => setCost(event.target.value)} />
          </div>
        </div>
        <div className="mt-4">
          <Label htmlFor="detalle">Detalle rep.</Label>
          <textarea id="detalle" className="field" value={detail} onChange={(event) => setDetail(event.target.value)} placeholder="Qué se ha hecho o qué falla" />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="reparado">Fecha reparado</Label>
            <input id="reparado" type="date" className="field" value={repaired ?? ""} onChange={(event) => setRepaired(event.target.value)} />
          </div>
          <div>
            <Label htmlFor="informado">Fecha informado</Label>
            <input id="informado" type="date" className="field" value={informed ?? ""} onChange={(event) => setInformed(event.target.value)} />
          </div>
          <div>
            <Label htmlFor="recogido">Fecha recogido</Label>
            <input id="recogido" type="date" className="field" value={collected ?? ""} onChange={(event) => setCollected(event.target.value)} />
          </div>
        </div>
        <div className="mt-4 max-w-xs">
          <Label htmlFor="pago">Cobro</Label>
          <select id="pago" className="field" value={payment ?? ""} onChange={(event) => setPayment(event.target.value)}>
            <option value="">Sin apuntar</option>
            {PAYMENTS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {error ? <Notice tone="bad">{error}</Notice> : null}
      <button type="button" className="btn btn-primary w-full sm:w-auto" disabled={saving} onClick={() => void save()}>
        {saving ? "Guardando…" : repair ? "Guardar cambios" : "Crear reparación"}
      </button>
    </div>
  );
}
