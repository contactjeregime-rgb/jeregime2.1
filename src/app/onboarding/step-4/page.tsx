"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getOnboardingStatus, requireStep } from "@/lib/requireOnboarding";

export default function OnboardingStep4() {
  const router = useRouter();
  const [diet, setDiet] = useState<string | null>(null);
  const [cooking, setCooking] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const status = await getOnboardingStatus();
      if (status.status === "in_progress" && !requireStep(status.step, 3, router)) return;
      if (!alive) return;

      if (status.status === "no_user") return router.replace("/login");
      if (status.status === "done") return router.replace("/dashboard");
    })();
    return () => {
      alive = false;
    };
  }, [router]);

  const canContinue = diet && cooking && !loading;

  async function handleContinue() {
    setErrorMsg(null);
    setLoading(true);

    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (!user) return router.replace("/login");

    const { error } = await supabase
      .from("jr_user_profile")
      .update({
        onboarding_step: 4,
        diet_type: diet,
        cooking_level: cooking,
      })
      .eq("user_id", user.id);

    if (error) {
      setLoading(false);
      setErrorMsg(error.message || "Impossible d’enregistrer.");
      return;
    }

    router.push("/onboarding/step-5");
  }

  return (
    <div className="max-w-xl mx-auto py-10 space-y-8">
      <h1 className="text-2xl font-semibold text-center">Alimentation & cuisine</h1>

      {errorMsg ? (
        <div className="border border-red-200 bg-red-50 text-red-700 rounded-lg p-3">
          {errorMsg}
        </div>
      ) : null}

      <div className="space-y-4">
        <h2 className="font-medium">Type d’alimentation</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            ["balanced", "Équilibrée"],
            ["lowcarb", "Low carb"],
            ["vegetarian", "Végétarienne"],
            ["halal", "Halal"],
            ["no_pork", "Sans porc"],
          ].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setDiet(v)}
              className={`border rounded-lg p-4 ${diet === v ? "border-black" : "border-gray-300"}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="font-medium">Niveau en cuisine</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            ["beginner", "Débutant"],
            ["intermediate", "Intermédiaire"],
            ["confident", "À l’aise"],
          ].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setCooking(v)}
              className={`border rounded-lg p-4 ${cooking === v ? "border-black" : "border-gray-300"}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <button
        disabled={!canContinue}
        onClick={handleContinue}
        className="w-full bg-black text-white py-4 rounded-lg disabled:opacity-40"
      >
        Continuer
      </button>
    </div>
  );
}
