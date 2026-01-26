"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type ProfileRow = {
  onboarding_completed: boolean | null;
  features_unlock_at: string | null;
  is_premium: boolean | null;
};

type CreditsRow = {
  vision_credits: number | null;
};

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
  const [visionCredits, setVisionCredits] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;

    async function init() {
      setChecking(true);

      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (!alive) return;

      const user = userRes?.user;
      if (userErr || !user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error: pErr } = await supabase
        .from("jr_user_profile")
        .select("onboarding_completed,features_unlock_at,is_premium")
        .eq("user_id", user.id)
        .maybeSingle<ProfileRow>();

      if (!alive) return;

      if (pErr || !profile?.onboarding_completed) {
        router.replace("/onboarding/step-1");
        return;
      }

      setGates({
        features_unlock_at: profile.features_unlock_at ?? null,
        is_premium: Boolean(profile.is_premium),
      });

      const { data: creditsRow, error: creditsErr } = await supabase
        .from("jr_user_credits")
        .select("vision_credits")
        .eq("user_id", user.id)
        .maybeSingle<CreditsRow>();

      if (!alive) return;

      if (creditsErr) {
        setVisionCredits(null);
      } else if (!creditsRow) {
        const { data: created, error: insErr } = await supabase
          .from("jr_user_credits")
          .insert({ user_id: user.id, vision_credits: 3 })
          .select("vision_credits")
          .maybeSingle<CreditsRow>();

        if (!alive) return;

        if (insErr) setVisionCredits(null);
        else setVisionCredits(typeof created?.vision_credits === "number" ? created.vision_credits : 3);
      } else {
        setVisionCredits(typeof creditsRow.vision_credits === "number" ? creditsRow.vision_credits : null);
      }

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
  const creditsLeft = typeof visionCredits === "number" ? Math.max(0, visionCredits) : null;

  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 py-16 bg-zinc-50">
        <div className="text-zinc-700">Chargement…</div>
      </main>
    );
  }

  const premiumBadge = gates?.is_premium ? (
    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">Premium</span>
  ) : (
    <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">Freemium</span>
  );

  return (
    <main className="min-h-screen px-6 py-12 bg-white">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="space-y-2">
          <p className="text-xs font-medium tracking-wide text-zinc-500">JE RÉGIME · DASHBOARD</p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-3xl font-bold text-zinc-900">Votre espace</h1>
            {premiumBadge}
          </div>
          <p className="text-zinc-600">Profil, bilan, outils IA — dans un cadre cabinet, propre et structuré.</p>
        </header>

        {/* ROW 1: Profil / Bilan */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-medium tracking-wide text-zinc-500">PROFIL</p>
            <h2 className="mt-2 text-base font-semibold text-zinc-900">Mes informations</h2>
            <p className="mt-1 text-sm text-zinc-600">Mettre à jour vos réponses d’onboarding (sans saisie libre).</p>

            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/dashboard/profile"
                className="inline-flex rounded-xl border border-zinc-300 px-5 py-3 text-sm font-medium hover:bg-zinc-50"
              >
                Modifier mes réponses
              </Link>
            </div>

            <p className="mt-3 text-xs text-zinc-500">
              Après modification, vous pourrez régénérer votre rapport et obtenir un nouvel avis.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-medium tracking-wide text-zinc-500">BILAN</p>
            <h2 className="mt-2 text-base font-semibold text-zinc-900">Rapport & avis</h2>
            <p className="mt-1 text-sm text-zinc-600">Consultez votre rapport sauvegardé et l’avis du diététicien.</p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Link href="/report" className="rounded-xl bg-black px-5 py-3 text-center text-sm font-medium text-white">
                Consulter mon rapport
              </Link>
              <Link
                href="/report/avis-expert"
                className="rounded-xl border border-zinc-300 px-5 py-3 text-center text-sm font-medium hover:bg-zinc-50"
              >
                Avis du diététicien
              </Link>
            </div>
          </div>
        </section>

        {/* ROW 2: Outils IA */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium tracking-wide text-zinc-500">OUTILS IA</p>
              <h2 className="mt-2 text-base font-semibold text-zinc-900">IA Vision</h2>
              <p className="mt-1 text-sm text-zinc-600">
                Deux modes : alimentation (frigo/ticket/plat) et corps (simulation illustrative).
              </p>
            </div>

            {!gates?.is_premium ? (
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">3 essais gratuits</span>
            ) : (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">Illimité</span>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link href="/vision" className="rounded-xl bg-black px-5 py-3 text-sm font-medium text-white">
              Ouvrir IA Vision
            </Link>

            {!gates?.is_premium ? (
              <span className="text-sm text-zinc-700">
                Crédits restants : <span className="font-medium">{creditsLeft ?? "—"}</span> / 3
              </span>
            ) : null}
          </div>

          {!gates?.is_premium && creditsLeft !== null && creditsLeft <= 0 ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-900">Crédits épuisés</p>
              <p className="mt-1 text-sm text-red-800">Passe Premium pour débloquer l’analyse photo illimitée.</p>
              <div className="mt-3">
                <Link href="/pricing" className="inline-flex rounded-xl bg-black px-5 py-3 text-sm font-medium text-white">
                  Activer Premium
                </Link>
              </div>
            </div>
          ) : null}
        </section>

        {/* ROW 3: Premium */}
        <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 shadow-sm">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-xs font-medium tracking-wide text-zinc-500">PREMIUM</p>
              <h2 className="mt-2 text-base font-semibold text-zinc-900">Accès complet</h2>
              <p className="mt-1 text-sm text-zinc-700">
                {gates?.is_premium ? (
                  <>✅ Premium actif : toutes les fonctionnalités sont disponibles.</>
                ) : dLeft !== null ? (
                  <>
                    Déblocage progressif dans <span className="font-medium">{dLeft}</span> jour(s) (teasing). Accès complet via Premium.
                  </>
                ) : (
                  <>Accès complet via Premium.</>
                )}
              </p>
            </div>

            {!gates?.is_premium ? (
              <Link href="/pricing" className="inline-flex rounded-xl bg-black px-5 py-3 text-sm font-medium text-white">
                Activer Premium
              </Link>
            ) : (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">Actif</span>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
