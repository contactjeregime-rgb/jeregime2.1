"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function DashboardPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

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
        .select("onboarding_completed")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!alive) return;

      if (error || !profile?.onboarding_completed) {
        router.replace("/onboarding/step-1");
        return;
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
          <p className="mt-3 text-zinc-600">
            Ton profil est prêt. Tu peux consulter ton rapport ou modifier tes réponses.
          </p>
        </div>

        <div className="grid gap-3">
          <Link
            href="/report"
            className="w-full bg-black text-white py-4 rounded-lg text-center font-medium"
          >
            Consulter mon rapport
          </Link>

          <Link
            href="/report/avis-expert"
            className="w-full border border-zinc-300 py-4 rounded-lg text-center font-medium"
          >
            Avis du diététicien
          </Link>

          <Link
            href="/dashboard/profile"
            className="w-full border border-zinc-300 py-4 rounded-lg text-center font-medium"
          >
            Modifier mes réponses
          </Link>
        </div>

        <p className="text-xs text-zinc-500">
          Toute modification met à jour ton profil. Tu peux ensuite régénérer ton rapport.
        </p>
      </div>
    </main>
  );
}
