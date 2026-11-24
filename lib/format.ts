export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function asNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return 0;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isNaN(number) ? 0 : number;
}

export function asOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export function madridToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function madridDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export function formatDate(value?: string | null) {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

export function formatTime(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatMoney(value?: number | string | null) {
  if (value === null || value === undefined || value === "") return "—";
  const number = asNumber(value);
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(number);
}

export function formatDuration(ms: number) {
  const safe = Math.max(0, ms);
  const hours = Math.floor(safe / 3_600_000);
  const minutes = Math.floor((safe % 3_600_000) / 60_000);
  return `${hours} h ${String(minutes).padStart(2, "0")} min`;
}

export function durationMs(start: string, end: string) {
  return Math.max(0, new Date(end).getTime() - new Date(start).getTime());
}

export function daysLabel(min?: number, max?: number) {
  if (min == null || max == null) return "Plazo a confirmar";
  if (min === max) return min === 1 ? "1 día laborable" : `${min} días laborables`;
  return `Entre ${min} y ${max} días laborables`;
}

export function invoiceCode(series: string, number: number) {
  return `${series}-${String(number).padStart(4, "0")}`;
}

export function toLocalInput(value: string) {
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function startOfWeek(isoDay: string) {
  const date = new Date(`${isoDay}T12:00:00`);
  const day = date.getDay();
  const diff = day === 0 ? 6 : day - 1;
  date.setDate(date.getDate() - diff);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function shiftDays(isoDay: string, amount: number) {
  const date = new Date(`${isoDay}T12:00:00`);
  date.setDate(date.getDate() + amount);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
