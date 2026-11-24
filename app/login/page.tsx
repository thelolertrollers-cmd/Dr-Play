"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Brand } from "@/components/brand";
import { Label, Notice } from "@/components/ui";
import { humanError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: signError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (signError) {
      setError(humanError(signError));
      return;
    }
    const next = new URLSearchParams(window.location.search).get("next") || "/panel";
    router.replace(next.startsWith("/panel") ? next : "/panel");
    router.refresh();
  }

  return (
    <main className="mx-auto grid min-h-dvh max-w-lg place-items-center px-5 py-10">
      <div className="w-full">
        <Brand />
        <h1 className="mt-8 font-display text-6xl uppercase leading-none">Entrar</h1>
        <form onSubmit={(event) => void submit(event)} className="mt-6 grid gap-4">
          <div>
            <Label htmlFor="email">Correo</Label>
            <input id="email" type="email" autoComplete="username" className="field" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </div>
          <div>
            <Label htmlFor="password">Contraseña</Label>
            <input id="password" type="password" autoComplete="current-password" className="field" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </div>
          {error ? <Notice tone="bad">{error}</Notice> : null}
          <button className="btn btn-primary" disabled={busy}>
            {busy ? "Entrando…" : "Entrar al taller"}
          </button>
        </form>
        <p className="mt-5 text-sm text-muted">
          ¿Sin cuenta? <Link className="font-bold text-cyan" href="/registro">Alta del equipo</Link>
        </p>
      </div>
    </main>
  );
}
