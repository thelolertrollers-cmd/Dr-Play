import Link from "next/link";

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-3">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan text-lg font-black text-ink">DP</span>
      <span>
        <span className="block font-display text-2xl uppercase leading-none tracking-wide">Doctor Play</span>
        <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted">Taller</span>
      </span>
    </Link>
  );
}
