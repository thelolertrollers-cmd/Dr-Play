"use client";

import { useRouter } from "next/navigation";
import { RepairForm } from "@/components/repair-form";
import { PageTitle } from "@/components/ui";

export default function NuevaReparacionPage() {
  const router = useRouter();
  return (
    <div>
      <PageTitle kicker="RECEPCIÓN" title="Nueva reparación" text="Cliente, teléfono, fecha de entrada y lo que haya que apuntar." />
      <RepairForm onSaved={(id) => router.push(`/panel/reparaciones/${id}`)} />
    </div>
  );
}
