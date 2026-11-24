"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { RepairForm } from "@/components/repair-form";
import { Pipeline, StatusPill } from "@/components/pipeline";
import { useSession } from "@/components/session";
import { Notice, PageTitle } from "@/components/ui";
import { PAYMENTS } from "@/lib/catalog";
import { humanError } from "@/lib/errors";
import { madridToday } from "@/lib/format";
import type { Repair } from "@/lib/types";

export default function ReparacionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { supabase, profile } = useSession();
  const [repair, setRepair] = useState<Repair | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [tick, setTick] = useState(0);
  const [collecting, setCollecting] = useState(false);

  async function load() {
    const { data, error: loadError } = await supabase
      .from("repairs")
      .select("*, client:clients(id, name, phone, tax_id)")
      .eq("id", params.id)
      .maybeSingle();
    if (loadError) {
      setError(humanError(loadError));
      return;
    }
    setRepair((data as Repair | null) ?? null);
    setTick((value) => value + 1);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function stamp(field: "repaired_at" | "informed_at" | "collected_at", payment?: string) {
    if (!repair) return;
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
    setCollecting(false);
    await load();
  }

  async function remove() {
    if (!repair) return;
    if (!window.confirm("¿Eliminar esta reparación?")) return;
    const { error: deleteError } = await supabase.from("repairs").delete().eq("id", repair.id);
    if (deleteError) {
      setError(humanError(deleteError));
      return;
    }
    router.push("/panel/reparaciones");
  }

  if (!repair) {
    return error ? <Notice tone="bad">{error}</Notice> : <p className="text-muted">Cargando reparación…</p>;
  }

  return (
    <div className="grid gap-5">
      <PageTitle
        kicker={repair.code ?? "REPARACIÓN"}
        title={repair.console ?? "Sin consola"}
        text={repair.fault ?? "Sin avería apuntada"}
        action={<Link href="/panel/reparaciones" className="btn btn-ghost">Volver</Link>}
      />
      <section className="card grid gap-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <StatusPill repair={repair} />
          <div className="flex flex-wrap gap-2">
            {!repair.repaired_at ? (
              <button type="button" className="btn btn-ghost" onClick={() => void stamp("repaired_at")}>
                Reparado hoy
              </button>
            ) : null}
            {!repair.informed_at ? (
              <button type="button" className="btn btn-ghost" onClick={() => void stamp("informed_at")}>
                Informado hoy
              </button>
            ) : null}
            {!repair.collected_at ? (
              <button type="button" className="btn btn-lime" onClick={() => setCollecting((value) => !value)}>
                Recogido hoy
              </button>
            ) : null}
          </div>
        </div>
        {collecting ? (
          <div className="flex flex-wrap gap-2">
            {PAYMENTS.map((item) => (
              <button key={item.id} type="button" className="chip" onClick={() => void stamp("collected_at", item.id)}>
                {item.label}
              </button>
            ))}
          </div>
        ) : null}
        <Pipeline repair={repair} />
      </section>
      {error ? <Notice tone="bad">{error}</Notice> : null}
      {saved ? <Notice tone="good">Cambios guardados.</Notice> : null}
      <RepairForm
        key={tick}
        repair={repair}
        onSaved={() => {
          setSaved(true);
          void load();
        }}
      />
      {profile.role === "admin" ? (
        <button type="button" className="btn btn-ghost w-fit text-magenta" onClick={() => void remove()}>
          Eliminar reparación
        </button>
      ) : null}
    </div>
  );
}
