"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getOnboardingStatus } from "@/lib/requireOnboarding";

export default function OnboardingSuccess() {
  const router = useRouter();

  useEffect(() => {
    let alive = true;
    (async () => {
      const status = await getOnboardingStatus();
      if (!alive) return;

      if (status.status === "no_user") {
        router.replace("/login");
        return;
      }

      if (status.status !== "done") {
        router.replace("/onboarding/step-1");
      }
    })();

    return () => { alive = false; };
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-white">
      <div className="max-w-xl text-center space-y-6">
        <h1 className="text-3xl font-bold">🎉 Profil complété</h1>
        <p className="text-zinc-600">
          Félicitations, ton profil JeRégime est prêt.
          Nous avons tout ce qu’il faut pour générer ton accompagnement personnalisé.
        </p>

        <button
          onClick={() => router.push("/dashboard")}
          className="w-full bg-black text-white py-4 rounded-lg"
        >
          Générer mon rapport personnalisé
        </button>
      </div>
    </main>
  );
}
