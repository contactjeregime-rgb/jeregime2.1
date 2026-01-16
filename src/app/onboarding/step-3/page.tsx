"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getOnboardingStatus, requireStep } from "@/lib/requireOnboarding";

export default function OnboardingStep3() {
  const router = useRouter();
  const [activity, setActivity] = useState<string | null>(null);
  const [work, setWork] = useState<string | null>(null);
  const [eatingOut, setEatingOut] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      const status = await getOnboardingStatus();
      if (status.status === "in_progress" && !requireStep(status.step, 2, router)) return;
      if (!alive) return;

      if (status.status === "no_user") {
        router.replace("/login");
        return;
      }
      if (status.status === "done") {
        router.replace("/dashboard");
        return;
      }
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  const canContinue = activity && work && eatingOut && !loading;

  async function handleContinue() {
    setErrorMsg(null);
    setLoading(true);

    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    const user = userRes?.user;

    if (userErr || !user) {
      router.push("/login");
      return;
    }

    const { error } = await supabase
      .from("jr_user_profile")
      .update({
        onboarding_step: 3,
        activity_level: activity,
        work_type: work,
        eating_out_freq: eatingOut,
      })
      .eq("user_id", user.id);

    if (error) {
      setLoading(false);
      setErrorMsg(error.message || "Impossible d’enregistrer. Réessaie.");
      return;
    }

    router.push("/onboarding/step-4");
  }

  return (
    <div className="max-w-xl mx-auto py-10 space-y-10">
      <h1 className="text-2xl font-semibold text-center">Votre rythme de vie</h1>

      {errorMsg ? (
        <div className="border border-red-200 bg-red-50 text-red-700 rounded-lg p-3">
          {errorMsg}
        </div>
      ) : null}

      <div className="space-y-4">
        <h2 className="font-medium">Niveau d’activité</h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            ["sedentary", "Sédentaire"],
            ["normal", "Normal"],
            ["active", "Actif"],
            ["very_active", "Très actif"],
          ].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setActivity(v)}
              className={`border rounded-lg p-4 ${
                activity === v ? "border-black" : "border-gray-300"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="font-medium">Type de travail</h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            ["sitting", "Assis"],
            ["standing", "Debout"],
            ["mixed", "Mixte"],
            ["shift", "Horaires décalés"],
          ].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setWork(v)}
              className={`border rounded-lg p-4 ${
                work === v ? "border-black" : "border-gray-300"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="font-medium">Repas à l’extérieur</h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            ["rare", "Rarement"],
            ["1_2_week", "1–2 / semaine"],
            ["3plus_week", "3+ / semaine"],
          ].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setEatingOut(v)}
              className={`border rounded-lg p-4 ${
                eatingOut === v ? "border-black" : "border-gray-300"
              }`}
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
