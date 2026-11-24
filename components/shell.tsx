"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Brand } from "@/components/brand";
import { ClockButton } from "@/components/clock";
import { Icon } from "@/components/icons";
import { SessionProvider, useAuthState, useSession } from "@/components/session";
import { humanError } from "@/lib/errors";
import { cn } from "@/lib/format";

const NAV = [
  { href: "/panel", label: "Inicio", icon: "home" },
  { href: "/panel/reparaciones", label: "Reparaciones", icon: "wrench" },
  { href: "/panel/clientes", label: "Clientes", icon: "users" },
  { href: "/panel/fichajes", label: "Fichajes", icon: "clock" },
  { href: "/panel/contabilidad", label: "Cuentas", icon: "coins" },
];

function active(pathname: string, href: string) {
  return href === "/panel" ? pathname === "/panel" : pathname.startsWith(href);
}

function Chrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { supabase, profile } = useSession();
  const items = profile.role === "admin" ? [...NAV, { href: "/panel/admin", label: "Ajustes", icon: "sliders" }] : NAV;

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[270px_1fr]">
      <aside className="no-print sticky top-0 hidden h-dvh flex-col border-r border-white/10 bg-ink/80 px-4 py-6 backdrop-blur lg:flex">
        <Brand href="/panel" />
        <nav className="mt-8 grid gap-1">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-3 py-3 font-bold",
                active(pathname, item.href) ? "bg-white/8 text-cyan" : "text-white/80 hover:bg-white/5",
              )}
            >
              <Icon name={item.icon} />
              {item.label}
            </Link>
          ))}
          <Link href="/consulta" className="mt-2 flex items-center gap-3 rounded-2xl px-3 py-3 font-bold text-magenta hover:bg-white/5">
            <Icon name="tag" />
            Consulta precios
          </Link>
        </nav>
        <div className="mt-auto grid gap-3 pt-6">
          <ClockButton />
          <div className="flex items-center justify-between gap-3 px-1">
            <div>
              <p className="font-bold leading-tight">{profile.full_name}</p>
              <p className="text-xs uppercase tracking-wider text-muted">{profile.role === "admin" ? "Administración" : "Equipo"}</p>
            </div>
            <button type="button" onClick={() => void signOut()} className="btn btn-ghost h-11 w-11 px-0" aria-label="Salir">
              <Icon name="logout" />
            </button>
          </div>
        </div>
      </aside>

      <div>
        <header className="no-print sticky top-0 z-30 border-b border-white/10 bg-ink/80 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <Brand href="/panel" />
            <button type="button" onClick={() => void signOut()} className="text-sm font-bold text-muted">
              Salir
            </button>
          </div>
          <div className="mt-3">
            <ClockButton />
          </div>
        </header>
        <main className="px-4 py-6 pb-28 lg:px-8 lg:pb-10">{children}</main>
        <nav className="no-print fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-white/10 bg-ink/95 px-1 py-2 backdrop-blur lg:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "grid place-items-center gap-1 rounded-xl py-1 text-[10px] font-bold",
                active(pathname, item.href) ? "text-cyan" : "text-muted",
              )}
            >
              <Icon name={item.icon} />
              {item.label === "Reparaciones" ? "Taller" : item.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

function Screen({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center px-5">
      <div className="card w-full max-w-lg p-8 text-center">
        <p className="font-display text-5xl uppercase">{title}</p>
        <p className="mt-3 text-muted">{text}</p>
        {action ? <div className="mt-6">{action}</div> : null}
      </div>
    </div>
  );
}

export function PanelShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const auth = useAuthState();

  useEffect(() => {
    if (!auth.loading && !auth.user) router.replace("/login");
  }, [auth.loading, auth.user, router]);

  if (auth.loading || !auth.user) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <div className="text-center">
          <p className="font-display text-5xl uppercase">Doctor Play</p>
          <p className="mt-2 text-muted">Abriendo el taller…</p>
        </div>
      </div>
    );
  }

  if (!auth.profile) {
    return (
      <Screen
        title="Falta la base"
        text={humanError(auth.error ?? "No hay ficha de empleado. Ejecuta supabase/schema.sql en el editor SQL de Supabase y vuelve a entrar.")}
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <a className="btn btn-primary" href="https://supabase.com/dashboard/project/eosxgpwuzhrynjgjpuyl/sql/new" target="_blank" rel="noreferrer">
              Abrir SQL
            </a>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                void auth.supabase.auth.signOut().then(() => router.replace("/login"));
              }}
            >
              Salir
            </button>
          </div>
        }
      />
    );
  }

  if (!auth.profile.active) {
    return (
      <Screen
        title="Cuenta en pausa"
        text={`${auth.profile.full_name}, administración tiene que volver a activar tu acceso.`}
        action={
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              void auth.supabase.auth.signOut().then(() => router.replace("/login"));
            }}
          >
            Salir
          </button>
        }
      />
    );
  }

  return (
    <SessionProvider supabase={auth.supabase} user={auth.user} profile={auth.profile} reload={auth.reload}>
      <Chrome>{children}</Chrome>
    </SessionProvider>
  );
}
