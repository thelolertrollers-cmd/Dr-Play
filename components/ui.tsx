import { cn } from "@/lib/format";

export function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label className="label" htmlFor={htmlFor}>
      {children}
    </label>
  );
}

export function Empty({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card px-6 py-14 text-center">
      <p className="font-display text-4xl uppercase">{title}</p>
      <p className="mx-auto mt-3 max-w-md text-muted">{text}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function Notice({
  children,
  tone = "info",
}: {
  children: React.ReactNode;
  tone?: "info" | "warn" | "bad" | "good";
}) {
  const tones = {
    info: "border-cyan/30 bg-cyan/10 text-cyan",
    warn: "border-amber/30 bg-amber/10 text-amber",
    bad: "border-magenta/40 bg-magenta/10 text-magenta",
    good: "border-lime/30 bg-lime/10 text-lime",
  };
  return <div className={cn("rounded-2xl border px-4 py-3 text-sm font-semibold", tones[tone])}>{children}</div>;
}

export function PageTitle({
  kicker,
  title,
  text,
  action,
}: {
  kicker?: string;
  title: string;
  text?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {kicker ? <p className="text-xs font-extrabold tracking-[0.22em] text-cyan">{kicker}</p> : null}
        <h1 className="font-display text-5xl uppercase leading-none">{title}</h1>
        {text ? <p className="mt-2 max-w-2xl text-muted">{text}</p> : null}
      </div>
      {action}
    </div>
  );
}
