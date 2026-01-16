"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getOnboardingStatus } from "@/lib/requireOnboarding";

export default function OnboardingSuccess() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      const status = await getOnboardingStatus();
      if (!alive) return;

      if (status.status === "no_user") {
        router.replace("/login");
        return;
      }

      if (status.status === "in_progress") {
        router.replace(`/onboarding/step-${status.step}`);
        return;
      }

      // status === "done"
      setChecking(false);
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 bg-white">
        <div className="max-w-xl text-center space-y-4">
          <p className="text-sm text-zinc-600">Vérification de ton profil…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-white">
      <div className="max-w-xl text-center space-y-6">
        <h1 className="text-3xl font-bold">🎉 Profil complété</h1>
        <p className="text-zinc-600">
          Ton profil JeRégime est prêt.
          Nous pouvons maintenant générer ton rapport personnalisé (V1).
        </p>

        <Link
          href="/report"
          className="block w-full bg-black text-white py-4 rounded-lg font-medium"
        >
          Générer mon rapport personnalisé
        </Link>

        <Link
          href="/dashboard"
          className="block w-full border border-zinc-300 py-4 rounded-lg font-medium"
        >
          Aller au dashboard
        </Link>

        <p className="text-xs text-zinc-500">
          Accès au rapport uniquement si l’onboarding est terminé.
        </p>
      </div>
    </main>
  );
}
