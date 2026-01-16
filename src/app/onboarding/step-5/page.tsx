"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getOnboardingStatus, requireStep } from "@/lib/requireOnboarding";

const ALLERGIES = [
  "gluten",
  "lactose",
  "arachide",
  "fruits_a_coque",
  "oeuf",
  "poisson",
  "crustaces",
  "soja",
  "sesame",
];

export default function OnboardingStep5() {
  const router = useRouter();
  const [targetWeight, setTargetWeight] = useState<number | null>(null);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      const status = await getOnboardingStatus();
      if (!alive) return;

      if (status.status === "no_user") return router.replace("/login");
      if (status.status === "done") return router.replace("/dashboard");
      if (status.status === "in_progress" && !requireStep(status.step, 4, router)) return;
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  const canContinue = targetWeight && !loading;

  function toggleAllergy(a: string) {
    setAllergies((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
  }

  async function handleContinue() {
    setErrorMsg(null);
    setLoading(true);

    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (!user) return router.replace("/login");

    const { error } = await supabase
      .from("jr_user_profile")
      .update({
        onboarding_step: 5,
        target_weight_kg: targetWeight,
        allergies,
      })
      .eq("user_id", user.id);

    if (error) {
      setLoading(false);
      setErrorMsg(error.message || "Impossible d’enregistrer.");
      return;
    }

    router.push("/onboarding/step-final");
  }

  return (
    <div className="max-w-xl mx-auto py-10 space-y-8">
      <h1 className="text-2xl font-semibold text-center">Objectif & allergies</h1>

      {errorMsg ? (
        <div className="border border-red-200 bg-red-50 text-red-700 rounded-lg p-3">
          {errorMsg}
        </div>
      ) : null}

      <div className="space-y-3">
        <label className="block text-sm font-medium">Poids cible</label>
        <select
          className="w-full border rounded-lg p-3"
          value={targetWeight ?? ""}
          onChange={(e) => setTargetWeight(Number(e.target.value))}
        >
          <option value="">Sélectionner</option>
          {Array.from({ length: 271 }, (_, i) => i + 30).map((v) => (
            <option key={v} value={v}>
              {v} kg
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        <h2 className="font-medium">Allergies (optionnel)</h2>
        <div className="grid grid-cols-2 gap-3">
          {ALLERGIES.map((a) => (
            <button
              key={a}
              onClick={() => toggleAllergy(a)}
              className={`border rounded-lg p-3 text-center ${
                allergies.includes(a) ? "border-black" : "border-gray-300"
              }`}
            >
              {a.replaceAll("_", " ")}
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
