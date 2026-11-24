import Link from "next/link";
import { Brand } from "@/components/brand";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-6xl flex-col px-5 py-8">
      <header className="flex items-center justify-between gap-4">
        <Brand />
        <a href="tel:+34614121568" className="text-sm font-bold text-cyan">
          614 121 568
        </a>
      </header>

      <section className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[1.15fr_.85fr]">
        <div>
          <p className="text-xs font-extrabold tracking-[0.28em] text-cyan">GETAFE · SERVICIO TÉCNICO</p>
          <h1 className="mt-4 font-display text-6xl uppercase leading-[0.9] sm:text-7xl">
            Servicio
            <br />
            técnico
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-muted">
            C. Crisantemo 12, 28903 Getafe. Presupuesto en el mostrador y acceso del equipo.
          </p>
        </div>

        <div className="grid gap-4">
          <Link href="/consulta" className="card group p-7 transition hover:border-magenta/50">
            <p className="text-xs font-extrabold tracking-[0.22em] text-magenta">TABLET DEL MOSTRADOR</p>
            <p className="mt-3 font-display text-5xl uppercase leading-none">Consulta de precio</p>
            <p className="mt-3 text-muted">Consola, avería, presupuesto y plazo.</p>
            <span className="btn btn-magenta mt-6">Abrir consulta</span>
          </Link>
          <Link href="/login" className="card p-7 transition hover:border-cyan/50">
            <p className="text-xs font-extrabold tracking-[0.22em] text-cyan">EQUIPO</p>
            <p className="mt-3 font-display text-4xl uppercase leading-none">Entrar al taller</p>
            <p className="mt-3 text-muted">Acceso del equipo.</p>
            <span className="btn btn-primary mt-6">Acceder</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
