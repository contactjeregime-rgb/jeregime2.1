"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onGoogle() {
    setMsg(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setMsg("SUPABASE: " + (error.message || JSON.stringify(error)));
      setLoading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (password.length < 6) {
      setMsg("Le mot de passe doit faire au moins 6 caractères.");
      return;
    }
    if (password !== password2) {
      setMsg("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setMsg("SUPABASE: " + (error.message || JSON.stringify(error)));
      setLoading(false);
      return;
    }

    router.replace("/onboarding");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16 bg-zinc-50">
      <div className="w-full max-w-md bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">Créer un compte</h1>
        <p className="text-zinc-600 mt-2">Démarrez votre bilan personnalisé.</p>

        <div className="mt-8">
          <button
            type="button"
            onClick={onGoogle}
            className="w-full rounded-full border border-zinc-200 bg-white py-3 font-semibold text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
            disabled={loading}
          >
            Continuer avec Google
          </button>
        </div>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-200" />
          <span className="text-xs text-zinc-400">ou</span>
          <div className="h-px flex-1 bg-zinc-200" />
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <label className="block">
            <span className="text-sm text-zinc-700">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:ring-2 focus:ring-zinc-900/10"
              placeholder="vous@email.com"
              autoComplete="email"
            />
          </label>

          <label className="block">
            <span className="text-sm text-zinc-700">Mot de passe</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:ring-2 focus:ring-zinc-900/10"
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </label>

          <label className="block">
            <span className="text-sm text-zinc-700">Répéter le mot de passe</span>
            <input
              type="password"
              required
              minLength={6}
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:ring-2 focus:ring-zinc-900/10"
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-zinc-900 text-white py-3 font-semibold hover:opacity-95 disabled:opacity-60"
          >
            {loading ? "Création..." : "Créer mon compte"}
          </button>
        </form>

        {msg && <p className="mt-4 text-sm text-zinc-700">{msg}</p>}

        <p className="mt-6 text-sm text-zinc-600">
          Déjà un compte ?{" "}
          <Link className="text-zinc-900 font-semibold" href="/login">
            Se connecter
          </Link>
        </p>
      </div>
    </main>
  );
}
