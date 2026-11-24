import { cn, formatDate } from "@/lib/format";
import { repairStatus, STATUS_LABEL, STATUS_TAG } from "@/lib/status";

export function StatusPill({
  repair,
}: {
  repair: { repaired_at?: string | null; informed_at?: string | null; collected_at?: string | null };
}) {
  const status = repairStatus(repair);
  return <span className={cn("tag", STATUS_TAG[status])}>{STATUS_LABEL[status]}</span>;
}

export function Pipeline({
  repair,
}: {
  repair: {
    received_at?: string | null;
    repaired_at?: string | null;
    informed_at?: string | null;
    collected_at?: string | null;
  };
}) {
  const steps = [
    { label: "Recibido", date: repair.received_at },
    { label: "Reparado", date: repair.repaired_at },
    { label: "Informado", date: repair.informed_at },
    { label: "Recogido", date: repair.collected_at },
  ];

  return (
    <ol className="grid grid-cols-4 gap-2">
      {steps.map((step) => {
        const done = Boolean(step.date);
        return (
          <li key={step.label}>
            <div className={cn("h-1.5 rounded-full", done ? "bg-cyan" : "bg-white/10")} />
            <p className={cn("mt-2 text-[11px] font-extrabold uppercase tracking-wider", done ? "text-white" : "text-muted")}>
              {step.label}
            </p>
            <p className="text-xs text-muted">{done ? formatDate(step.date) : "Sin fecha"}</p>
          </li>
        );
      })}
    </ol>
  );
}
