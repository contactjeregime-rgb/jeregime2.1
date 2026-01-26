"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Gates = {
  features_unlock_at: string | null;
  is_premium: boolean;
};

function daysUntil(ts: string | null): number | null {
  if (!ts) return null;
  const ms = new Date(ts).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  return Math.max(0, Math.ceil(ms / 86400000));
}

export default function DashboardPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [gates, setGates] = useState<Gates | null>(null);

  useEffect(() => {
    let alive = true;

    async function init() {
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (!alive) return;

      const user = userRes?.user;
      if (userErr || !user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error } = await supabase
        .from("jr_user_profile")
        .select("onboarding_completed,features_unlock_at,is_premium")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!alive) return;

      if (error || !profile?.onboarding_completed) {
        router.replace("/onboarding/step-1");
        return;
      }

      setGates({
        features_unlock_at: profile?.features_unlock_at ?? null,
        is_premium: Boolean(profile?.is_premium),
      });
      setChecking(false);
    }

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) router.replace("/login");
    });

    return () => {
      alive = false;
      sub?.subscription?.unsubscribe();
    };
  }, [router]);

  const dLeft = useMemo(() => daysUntil(gates?.features_unlock_at ?? null), [gates?.features_unlock_at]);

  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 py-16 bg-zinc-50">
        <div className="text-zinc-700">Chargement…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-16 bg-white">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Dashboard</h1>
          <p className="mt-3 text-zinc-600">Ton profil est prêt. Tu peux consulter ton rapport, ton avis, ou modifier tes réponses.</p>
        </div>

        <div className="grid gap-3">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-sm font-semibold text-zinc-900">Fonctionnalités avancées</p>
            <p className="mt-1 text-sm text-zinc-700">
              {gates?.is_premium ? (
                <>✅ Premium actif : toutes les fonctionnalités sont disponibles.</>
              ) : dLeft !== null ? (
                <>
                  Disponible dans <span className="font-medium">{dLeft}</span> jour(s) — aperçu visible, accès Premium requis.
                </>
              ) : (
                <>Aperçu visible, accès Premium requis.</>
              )}
            </p>
            {!gates?.is_premium ? (
              <div className="mt-3">
                <Link href="/pricing" className="inline-flex rounded-lg bg-black px-4 py-2 text-sm font-medium text-white">
                  Débloquer Premium
                </Link>
              </div>
            ) : null}
          </div>

          <Link href="/report" className="w-full bg-black text-white py-4 rounded-lg text-center font-medium">
            Consulter mon rapport
          </Link>

          <Link href="/report/avis-expert" className="w-full border border-zinc-300 py-4 rounded-lg text-center font-medium">
            Avis du diététicien
          </Link>

          <Link href="/dashboard/profile" className="w-full border border-zinc-300 py-4 rounded-lg text-center font-medium">
            Modifier mes réponses
          </Link>
        </div>

        <p className="text-xs text-zinc-500">
          Toute modification met à jour ton profil. Tu peux ensuite régénérer ton rapport et générer un nouvel avis.
        </p>
      </div>
    </main>
  );
}
