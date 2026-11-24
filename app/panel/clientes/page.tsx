"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "@/components/session";
import { Empty, Label, Notice, PageTitle } from "@/components/ui";
import { humanError } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import type { Client, Repair } from "@/lib/types";

export default function ClientesPage() {
  const { supabase } = useSession();
  const [clients, setClients] = useState<Client[]>([]);
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: "", phone: "", tax_id: "", notes: "" });

  async function load() {
    const [clientsRes, repairsRes] = await Promise.all([
      supabase.from("clients").select("*").order("name"),
      supabase.from("repairs").select("id, code, client_id, console, received_at, collected_at").order("received_at", { ascending: false }),
    ]);
    if (clientsRes.error || repairsRes.error) {
      setError(humanError(clientsRes.error ?? repairsRes.error));
      return;
    }
    setClients((clientsRes.data as Client[] | null) ?? []);
    setRepairs((repairsRes.data as Repair[] | null) ?? []);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createClient(event: React.FormEvent) {
    event.preventDefault();
    const { error: insertError } = await supabase.from("clients").insert({
      name: draft.name.trim(),
      phone: draft.phone.trim(),
      tax_id: draft.tax_id.trim() || null,
      notes: draft.notes.trim() || null,
    });
    if (insertError) {
      setError(humanError(insertError));
      return;
    }
    setDraft({ name: "", phone: "", tax_id: "", notes: "" });
    await load();
  }

  async function save(client: Client) {
    const { error: updateError } = await supabase
      .from("clients")
      .update({ name: client.name, phone: client.phone, tax_id: client.tax_id, notes: client.notes })
      .eq("id", client.id);
    if (updateError) setError(humanError(updateError));
  }

  const visible = clients.filter((client) => {
    const text = query.trim().toLowerCase();
    if (!text) return true;
    return `${client.name} ${client.phone} ${client.tax_id ?? ""}`.toLowerCase().includes(text);
  });

  return (
    <div>
      <PageTitle kicker="FICHAS" title="Clientes" text="Nombre, teléfono y el historial de consolas que han dejado." />
      {error ? <div className="mb-4"><Notice tone="bad">{error}</Notice></div> : null}
      <form onSubmit={(event) => void createClient(event)} className="card mb-4 grid gap-3 p-4 md:grid-cols-4">
        <div>
          <Label htmlFor="nuevo-nombre">Cliente</Label>
          <input id="nuevo-nombre" className="field" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required />
        </div>
        <div>
          <Label htmlFor="nuevo-telefono">Teléfono</Label>
          <input id="nuevo-telefono" className="field" value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} required />
        </div>
        <div>
          <Label htmlFor="nuevo-nif">NIF</Label>
          <input id="nuevo-nif" className="field" value={draft.tax_id} onChange={(event) => setDraft({ ...draft, tax_id: event.target.value })} />
        </div>
        <button className="btn btn-primary self-end">Añadir cliente</button>
      </form>
      <input className="field mb-4" placeholder="Buscar nombre o teléfono" value={query} onChange={(event) => setQuery(event.target.value)} />
      {visible.length === 0 ? (
        <Empty title="Sin clientes" text="La ficha se crea sola al dar de alta una reparación, o desde el formulario de arriba." />
      ) : (
        <div className="grid gap-3">
          {visible.map((client) => {
            const history = repairs.filter((repair) => repair.client_id === client.id);
            const open = openId === client.id;
            return (
              <article key={client.id} className="card p-4">
                <button type="button" className="flex w-full items-center justify-between gap-3 text-left" onClick={() => setOpenId(open ? null : client.id)}>
                  <span>
                    <span className="block font-display text-3xl uppercase leading-none">{client.name}</span>
                    <span className="text-sm text-muted">{client.phone} · {history.length} reparaciones</span>
                  </span>
                  <span className="text-cyan">{open ? "Cerrar" : "Abrir"}</span>
                </button>
                {open ? (
                  <div className="mt-4 grid gap-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input className="field" value={client.name} onChange={(event) => setClients(clients.map((item) => item.id === client.id ? { ...item, name: event.target.value } : item))} />
                      <input className="field" value={client.phone} onChange={(event) => setClients(clients.map((item) => item.id === client.id ? { ...item, phone: event.target.value } : item))} />
                      <input className="field" placeholder="NIF" value={client.tax_id ?? ""} onChange={(event) => setClients(clients.map((item) => item.id === client.id ? { ...item, tax_id: event.target.value } : item))} />
                      <input className="field" placeholder="Notas" value={client.notes ?? ""} onChange={(event) => setClients(clients.map((item) => item.id === client.id ? { ...item, notes: event.target.value } : item))} />
                    </div>
                    <button type="button" className="btn btn-primary w-fit" onClick={() => void save(client)}>Guardar ficha</button>
                    <div className="grid gap-2">
                      {history.map((repair) => (
                        <Link key={repair.id} href={`/panel/reparaciones/${repair.id}`} className="rounded-2xl bg-white/5 px-4 py-3">
                          {repair.code} · {repair.console ?? "Consola"} · {formatDate(repair.received_at)} {repair.collected_at ? "· recogida" : "· en taller"}
                        </Link>
                      ))}
                    </div>
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
