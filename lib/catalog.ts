import type { Quote } from "@/lib/types";

export const PAYMENTS = [
  { id: "efectivo", label: "Efectivo" },
  { id: "tarjeta", label: "Tarjeta" },
  { id: "bizum", label: "Bizum" },
  { id: "transferencia", label: "Transferencia" },
] as const;

export function paymentLabel(id?: string | null) {
  return PAYMENTS.find((item) => item.id === id)?.label ?? "—";
}

export const FAMILIES: Record<string, { label: string; color: string }> = {
  playstation: { label: "PlayStation", color: "#7eb6ff" },
  nintendo: { label: "Nintendo", color: "#ff7a90" },
  xbox: { label: "Xbox", color: "#5dffa8" },
  otra: { label: "Otras", color: "#3de1ff" },
};

export const CONSOLES = [
  { name: "PS3", family: "playstation", order: 10 },
  { name: "PS4", family: "playstation", order: 20 },
  { name: "PS4 Pro", family: "playstation", order: 30 },
  { name: "PS5", family: "playstation", order: 40 },
  { name: "PS5 Pro", family: "playstation", order: 50 },
  { name: "Switch Lite", family: "nintendo", order: 60 },
  { name: "Switch", family: "nintendo", order: 70 },
  { name: "Switch OLED", family: "nintendo", order: 80 },
  { name: "Switch 2", family: "nintendo", order: 90 },
  { name: "Xbox One", family: "xbox", order: 100 },
  { name: "Xbox Series S", family: "xbox", order: 110 },
  { name: "Xbox Series X", family: "xbox", order: 120 },
] as const;

export const EXTRA_DEVICES = [
  { name: "Móvil Android", family: "otra", order: 200 },
  { name: "iPhone", family: "otra", order: 210 },
  { name: "Ordenador", family: "otra", order: 220 },
] as const;

export const DEVICES = [...CONSOLES, ...EXTRA_DEVICES];

export const FAULTS = [
  { name: "No enciende", order: 1, min: 2, max: 5, note: "Revisión de alimentación y placa." },
  { name: "Hace ruido", order: 2, min: 1, max: 2, note: "Limpieza, pasta térmica y control de temperatura." },
  { name: "No carga", order: 3, min: 1, max: 3, note: "Puerto, fuente o conector." },
  { name: "Se apaga sola", order: 4, min: 2, max: 4, note: "Suele ser calor, alimentación o un fallo de placa." },
] as const;

/** Guía inicial. Mantener los mismos importes en supabase/schema.sql. */
export const PRICE: Record<string, Record<string, number>> = {
  PS3: { "No enciende": 65, "Hace ruido": 45, "No carga": 49, "Se apaga sola": 59 },
  PS4: { "No enciende": 75, "Hace ruido": 49, "No carga": 55, "Se apaga sola": 69 },
  "PS4 Pro": { "No enciende": 85, "Hace ruido": 55, "No carga": 59, "Se apaga sola": 75 },
  PS5: { "No enciende": 119, "Hace ruido": 69, "No carga": 79, "Se apaga sola": 99 },
  "PS5 Pro": { "No enciende": 139, "Hace ruido": 79, "No carga": 89, "Se apaga sola": 119 },
  "Switch Lite": { "No enciende": 69, "Hace ruido": 39, "No carga": 45, "Se apaga sola": 59 },
  Switch: { "No enciende": 79, "Hace ruido": 45, "No carga": 55, "Se apaga sola": 69 },
  "Switch OLED": { "No enciende": 89, "Hace ruido": 49, "No carga": 59, "Se apaga sola": 75 },
  "Switch 2": { "No enciende": 129, "Hace ruido": 79, "No carga": 89, "Se apaga sola": 109 },
  "Xbox One": { "No enciende": 79, "Hace ruido": 49, "No carga": 55, "Se apaga sola": 69 },
  "Xbox Series S": { "No enciende": 99, "Hace ruido": 59, "No carga": 69, "Se apaga sola": 85 },
  "Xbox Series X": { "No enciende": 119, "Hace ruido": 69, "No carga": 75, "Se apaga sola": 99 },
};

export function familyOf(consoleName?: string | null) {
  return DEVICES.find((item) => item.name === consoleName)?.family ?? "otra";
}

export function fallbackQuote(consoleName: string, fault: string): Quote | null {
  const price = PRICE[consoleName]?.[fault];
  const faultMeta = FAULTS.find((item) => item.name === fault);
  if (price == null || !faultMeta) return null;
  const recent = consoleName === "Switch 2" || consoleName === "PS5 Pro";
  return {
    found: true,
    live: false,
    console: consoleName,
    fault,
    price,
    base_price: price,
    min_days: faultMeta.min,
    max_days: faultMeta.max,
    busy: false,
    surcharge_percent: 0,
    notes: recent
      ? `${faultMeta.note} Estimación para un modelo reciente. El precio se confirma al diagnosticar.`
      : faultMeta.note,
  };
}
