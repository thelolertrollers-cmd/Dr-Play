export type RepairStatus = "taller" | "reparado" | "informado" | "recogido";

export function repairStatus(repair: {
  repaired_at?: string | null;
  informed_at?: string | null;
  collected_at?: string | null;
}): RepairStatus {
  if (repair.collected_at) return "recogido";
  if (repair.informed_at) return "informado";
  if (repair.repaired_at) return "reparado";
  return "taller";
}

export const STATUS_LABEL: Record<RepairStatus, string> = {
  taller: "En taller",
  reparado: "Reparado",
  informado: "Informado",
  recogido: "Recogido",
};

export const STATUS_TAG: Record<RepairStatus, string> = {
  taller: "tag-taller",
  reparado: "tag-reparado",
  informado: "tag-informado",
  recogido: "tag-recogido",
};
