"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Brand } from "@/components/brand";
import { Label, Notice } from "@/components/ui";
import { humanError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [invite, setInvite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 6) {
      setError("La contraseña necesita al menos 6 caracteres.");
      return;
    }
    setBusy(true);
    setError(null);
    setInfo(null);
    const supabase = createClient();
    const { data, error: signError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: name.trim(),
          invite_code: invite.trim(),
        },
      },
    });
    setBusy(false);
    if (signError) {
      setError(humanError(signError));
      return;
    }
    if (!data.session) {
      setInfo("Cuenta creada. Revisa el correo o desactiva Confirm email en Supabase para entrar sin ese paso.");
      return;
    }
    router.replace("/panel");
    router.refresh();
  }

  return (
    <main className="mx-auto grid min-h-dvh max-w-lg place-items-center px-5 py-10">
      <div className="w-full">
        <Brand />
        <h1 className="mt-8 font-display text-6xl uppercase leading-none">Alta</h1>
        <p className="mt-3 text-muted">
          La primera cuenta será administración y no necesita código. Las siguientes usan el código del taller.
        </p>
        <form onSubmit={(event) => void submit(event)} className="mt-6 grid gap-4">
          <div>
            <Label htmlFor="nombre">Nombre</Label>
            <input id="nombre" className="field" value={name} onChange={(event) => setName(event.target.value)} required />
          </div>
          <div>
            <Label htmlFor="email">Correo</Label>
            <input id="email" type="email" autoComplete="username" className="field" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </div>
          <div>
            <Label htmlFor="password">Contraseña</Label>
            <input id="password" type="password" autoComplete="new-password" className="field" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </div>
          <div>
            <Label htmlFor="codigo">Código del taller</Label>
            <input id="codigo" className="field" value={invite} onChange={(event) => setInvite(event.target.value)} placeholder="Vacío solo en la primera cuenta" />
          </div>
          {error ? <Notice tone="bad">{error}</Notice> : null}
          {info ? <Notice tone="warn">{info}</Notice> : null}
          <button className="btn btn-primary" disabled={busy}>
            {busy ? "Creando…" : "Crear cuenta"}
          </button>
        </form>
        <p className="mt-5 text-sm text-muted">
          ¿Ya tienes cuenta? <Link className="font-bold text-cyan" href="/login">Entrar</Link>
        </p>
      </div>
    </main>
  );
}
