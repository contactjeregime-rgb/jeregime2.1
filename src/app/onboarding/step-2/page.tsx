"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getOnboardingStatus, requireStep } from "@/lib/requireOnboarding";

export default function OnboardingStep2() {
  const router = useRouter();
  const [age, setAge] = useState<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [weight, setWeight] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      const status = await getOnboardingStatus();
      if (status.status === "in_progress" && !requireStep(status.step, 1, router)) return;
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

  const canContinue = age && height && weight && !loading;

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
        onboarding_step: 2,
        age,
        height_cm: height,
        weight_kg: weight,
      })
      .eq("user_id", user.id);

    if (error) {
      setLoading(false);
      setErrorMsg(error.message || "Impossible d’enregistrer. Réessaie.");
      return;
    }

    router.push("/onboarding/step-3");
  }

  return (
    <div className="max-w-xl mx-auto py-10 space-y-8">
      <h1 className="text-2xl font-semibold text-center">
        Quelques infos pour personnaliser
      </h1>

      {errorMsg ? (
        <div className="border border-red-200 bg-red-50 text-red-700 rounded-lg p-3">
          {errorMsg}
        </div>
      ) : null}

      <div className="space-y-4">
        <label className="block text-sm font-medium">Âge</label>
        <select
          className="w-full border rounded-lg p-3"
          value={age ?? ""}
          onChange={(e) => setAge(Number(e.target.value))}
        >
          <option value="">Sélectionner</option>
          {Array.from({ length: 53 }, (_, i) => i + 18).map((v) => (
            <option key={v} value={v}>
              {v} ans
            </option>
          ))}
        </select>

        <label className="block text-sm font-medium">Taille</label>
        <select
          className="w-full border rounded-lg p-3"
          value={height ?? ""}
          onChange={(e) => setHeight(Number(e.target.value))}
        >
          <option value="">Sélectionner</option>
          {Array.from({ length: 111 }, (_, i) => i + 120).map((v) => (
            <option key={v} value={v}>
              {v} cm
            </option>
          ))}
        </select>

        <label className="block text-sm font-medium">Poids</label>
        <select
          className="w-full border rounded-lg p-3"
          value={weight ?? ""}
          onChange={(e) => setWeight(Number(e.target.value))}
        >
          <option value="">Sélectionner</option>
          {Array.from({ length: 171 }, (_, i) => i + 30).map((v) => (
            <option key={v} value={v}>
              {v} kg
            </option>
          ))}
        </select>
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
