"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "@/components/session";
import { Label, Notice, PageTitle } from "@/components/ui";
import { CONSOLES, FAMILIES } from "@/lib/catalog";
import { humanError } from "@/lib/errors";
import { asNumber } from "@/lib/format";
import type { PriceRow, Profile, ShopSettings } from "@/lib/types";

const emptyPrice = {
  console: "PS5",
  console_family: "playstation",
  custom: "",
  fault: "",
  base_price: "79",
  min_days: "1",
  max_days: "3",
  notes: "",
};

export default function AdminPage() {
  const { supabase, profile } = useSession();
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [people, setPeople] = useState<Profile[]>([]);
  const [prices, setPrices] = useState<PriceRow[]>([]);
  const [fresh, setFresh] = useState(emptyPrice);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function load() {
    const [settingsRes, peopleRes, pricesRes] = await Promise.all([
      supabase.from("shop_settings").select("*").eq("id", 1).maybeSingle(),
      supabase.from("profiles").select("*").order("full_name"),
      supabase.from("price_guide").select("*").order("display_order").order("fault_order"),
    ]);
    const failure = settingsRes.error || peopleRes.error || pricesRes.error;
    if (failure) {
      setError(humanError(failure));
      return;
    }
    setSettings((settingsRes.data as ShopSettings | null) ?? null);
    setPeople((peopleRes.data as Profile[] | null) ?? []);
    setPrices((pricesRes.data as PriceRow[] | null) ?? []);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groups = useMemo(() => {
    const map = new Map<string, PriceRow[]>();
    for (const row of prices) map.set(row.console, [...(map.get(row.console) ?? []), row]);
    return [...map.entries()];
  }, [prices]);

  if (profile.role !== "admin") {
    return <Notice tone="warn">Esta pantalla es de administración.</Notice>;
  }

  async function saveSettings() {
    if (!settings) return;
    const { error: updateError } = await supabase
      .from("shop_settings")
      .update({
        shop_name: settings.shop_name,
        legal_name: settings.legal_name,
        tax_id: settings.tax_id,
        phone: settings.phone,
        email: settings.email,
        address: settings.address,
        invoice_series: settings.invoice_series,
        pending_threshold: Number(settings.pending_threshold),
        surcharge_percent: Number(settings.surcharge_percent),
        invite_code: settings.invite_code.trim(),
      })
      .eq("id", 1);
    if (updateError) {
      setError(humanError(updateError));
      return;
    }
    setMessage("Ajustes guardados.");
  }

  async function savePeople(person: Profile) {
    const { error: updateError } = await supabase.rpc("set_employee", {
      p_id: person.id,
      p_role: person.role,
      p_active: person.active,
    });
    if (updateError) {
      setError(humanError(updateError));
      return;
    }
    setMessage("Equipo actualizado.");
    await load();
  }

  function patchPrice(id: string, patch: Partial<PriceRow>) {
    setPrices(prices.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  async function savePrices() {
    const results = await Promise.all(
      prices.map((row) =>
        supabase
          .from("price_guide")
          .update({
            base_price: asNumber(row.base_price),
            min_days: Number(row.min_days),
            max_days: Number(row.max_days),
            notes: row.notes,
            active: row.active,
          })
          .eq("id", row.id),
      ),
    );
    const failure = results.find((result) => result.error)?.error;
    if (failure) {
      setError(humanError(failure));
      return;
    }
    setMessage("Guía de precios guardada.");
  }

  async function addPrice(event: React.FormEvent) {
    event.preventDefault();
    const consoleName = fresh.console === "Otra" ? fresh.custom.trim() : fresh.console;
    if (!consoleName) {
      setError("Escribe el nombre de la consola.");
      return;
    }
    const known = CONSOLES.find((item) => item.name === consoleName);
    const order = known?.order ?? 200;
    const { error: insertError } = await supabase.from("price_guide").insert({
      console: consoleName,
      console_family: known?.family ?? "otra",
      fault: fresh.fault.trim(),
      base_price: Number(fresh.base_price),
      min_days: Number(fresh.min_days),
      max_days: Number(fresh.max_days),
      notes: fresh.notes.trim() || null,
      display_order: order,
      fault_order: 9,
    });
    if (insertError) {
      setError(humanError(insertError));
      return;
    }
    setFresh(emptyPrice);
    setMessage("Precio añadido.");
    await load();
  }

  return (
    <div className="grid gap-6">
      <PageTitle kicker="ADMINISTRACIÓN" title="Ajustes" />
      {error ? <Notice tone="bad">{error}</Notice> : null}
      {message ? <Notice tone="good">{message}</Notice> : null}

      {settings ? (
        <section className="card grid gap-4 p-5">
          <h2 className="font-display text-3xl uppercase">Taller</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nombre comercial" value={settings.shop_name} onChange={(value) => setSettings({ ...settings, shop_name: value })} />
            <Field label="Razón social" value={settings.legal_name ?? ""} onChange={(value) => setSettings({ ...settings, legal_name: value })} />
            <Field label="NIF del taller" value={settings.tax_id ?? ""} onChange={(value) => setSettings({ ...settings, tax_id: value })} />
            <Field label="Teléfono" value={settings.phone ?? ""} onChange={(value) => setSettings({ ...settings, phone: value })} />
            <Field label="Email" value={settings.email ?? ""} onChange={(value) => setSettings({ ...settings, email: value })} />
            <Field label="Serie de factura" value={settings.invoice_series} onChange={(value) => setSettings({ ...settings, invoice_series: value })} />
            <div className="sm:col-span-2">
              <Field label="Dirección" value={settings.address ?? ""} onChange={(value) => setSettings({ ...settings, address: value })} />
            </div>
            <Field label="Subir precio a partir de" value={String(settings.pending_threshold)} onChange={(value) => setSettings({ ...settings, pending_threshold: Number(value) })} type="number" />
            <Field label="Porcentaje de subida" value={String(settings.surcharge_percent)} onChange={(value) => setSettings({ ...settings, surcharge_percent: value })} type="number" />
            <div className="sm:col-span-2">
              <Label htmlFor="codigo">Código para nuevos empleados</Label>
              <div className="flex gap-2">
                <input id="codigo" className="field" value={settings.invite_code} onChange={(event) => setSettings({ ...settings, invite_code: event.target.value })} />
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    void navigator.clipboard.writeText(settings.invite_code);
                    setCopied(true);
                  }}
                >
                  {copied ? "Copiado" : "Copiar"}
                </button>
              </div>
            </div>
          </div>
          <button type="button" className="btn btn-primary w-fit" onClick={() => void saveSettings()}>Guardar ajustes</button>
        </section>
      ) : null}

      <section className="card p-5">
        <h2 className="font-display text-3xl uppercase">Equipo</h2>
        <div className="mt-4 grid gap-3">
          {people.map((person) => (
            <div key={person.id} className="grid items-center gap-2 rounded-2xl bg-white/5 p-3 sm:grid-cols-[1fr_160px_140px_auto]">
              <div>
                <p className="font-bold">{person.full_name}</p>
                <p className="text-xs text-muted">{person.id === profile.id ? "Esta es tu cuenta" : person.role === "admin" ? "Administración" : "Empleado"}</p>
              </div>
              <select className="field" value={person.role} onChange={(event) => setPeople(people.map((item) => item.id === person.id ? { ...item, role: event.target.value as Profile["role"] } : item))}>
                <option value="employee">Empleado</option>
                <option value="admin">Administración</option>
              </select>
              <label className="flex items-center gap-2 text-sm font-bold">
                <input type="checkbox" checked={person.active} onChange={(event) => setPeople(people.map((item) => item.id === person.id ? { ...item, active: event.target.checked } : item))} />
                Activo
              </label>
              <button type="button" className="btn btn-ghost" onClick={() => void savePeople(person)}>Guardar</button>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-3xl uppercase">Guía de precios</h2>
          <button type="button" className="btn btn-primary" onClick={() => void savePrices()}>Guardar precios</button>
        </div>
        {groups.map(([consoleName, rows]) => (
          <details key={consoleName} className="card p-4">
            <summary className="cursor-pointer font-display text-2xl uppercase" style={{ color: FAMILIES[rows[0]?.console_family ?? "otra"].color }}>
              {consoleName}
            </summary>
            <div className="mt-3 grid gap-2">
              {rows.map((row) => (
                <div key={row.id} className="grid gap-2 sm:grid-cols-[1.2fr_.6fr_.4fr_.4fr_auto]">
                  <p className="self-center font-bold">{row.fault}</p>
                  <input className="field" inputMode="decimal" aria-label={`Precio ${row.fault}`} value={row.base_price} onChange={(event) => patchPrice(row.id, { base_price: event.target.value })} />
                  <input className="field" type="number" aria-label="Días mínimos" value={row.min_days} onChange={(event) => patchPrice(row.id, { min_days: Number(event.target.value) })} />
                  <input className="field" type="number" aria-label="Días máximos" value={row.max_days} onChange={(event) => patchPrice(row.id, { max_days: Number(event.target.value) })} />
                  <label className="flex items-center gap-2 text-sm font-bold">
                    <input type="checkbox" checked={row.active} onChange={(event) => patchPrice(row.id, { active: event.target.checked })} />
                    Visible
                  </label>
                </div>
              ))}
            </div>
          </details>
        ))}
        <form onSubmit={(event) => void addPrice(event)} className="card grid gap-3 p-4 md:grid-cols-3">
          <h3 className="font-display text-2xl uppercase md:col-span-3">Añadir combinación</h3>
          <select className="field" value={fresh.console} onChange={(event) => setFresh({ ...fresh, console: event.target.value })}>
            {CONSOLES.map((item) => <option key={item.name}>{item.name}</option>)}
            <option>Otra</option>
          </select>
          {fresh.console === "Otra" ? (
            <input className="field" placeholder="Nombre de la consola" value={fresh.custom} onChange={(event) => setFresh({ ...fresh, custom: event.target.value })} required />
          ) : null}
          <input className="field" placeholder="Avería" value={fresh.fault} onChange={(event) => setFresh({ ...fresh, fault: event.target.value })} required />
          <input className="field" placeholder="Precio" inputMode="decimal" value={fresh.base_price} onChange={(event) => setFresh({ ...fresh, base_price: event.target.value })} required />
          <input className="field" type="number" aria-label="Mínimo de días" value={fresh.min_days} onChange={(event) => setFresh({ ...fresh, min_days: event.target.value })} />
          <input className="field" type="number" aria-label="Máximo de días" value={fresh.max_days} onChange={(event) => setFresh({ ...fresh, max_days: event.target.value })} />
          <button className="btn btn-magenta">Añadir a la guía</button>
        </form>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <input id={id} type={type} className="field" value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
