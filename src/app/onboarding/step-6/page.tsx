"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getOnboardingStatus, requireStep } from "@/lib/requireOnboarding";

// Step-6 = étape "tampon" légère (aucune saisie libre).
// Objectif: ne pas casser le build + garder une séquence stable avant step-final.

export default function OnboardingStep6() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      const status = await getOnboardingStatus();
      if (!alive) return;

      if (status.status === "no_user") return router.replace("/login");
      if (status.status === "done") return router.replace("/dashboard");

      // On ne doit pas accéder à cette page si step-5 non fait
      if (status.status === "in_progress" && !requireStep(status.step, 5, router)) return;
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  async function handleContinue() {
    setLoading(true);

    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (!user) return router.replace("/login");

    // On marque onboarding_step=6 (cohérence) puis on va sur step-final
    const { error } = await supabase
      .from("jr_user_profile")
      .update({ onboarding_step: 6 })
      .eq("user_id", user.id);

    if (!error) router.push("/onboarding/step-final");
    setLoading(false);
  }

  return (
    <div className="max-w-xl mx-auto py-10 space-y-8">
      <h1 className="text-2xl font-semibold text-center">Dernière étape</h1>

      <p className="text-sm text-gray-700 text-center">
        On finalise ton profil (sommeil et habitudes) avant de générer ton rapport.
      </p>

      <button
        disabled={loading}
        onClick={handleContinue}
        className="w-full bg-black text-white py-4 rounded-lg disabled:opacity-60"
      >
        {loading ? "Chargement…" : "Continuer"}
      </button>
    </div>
  );
}
