"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getOnboardingStatus } from "@/lib/requireOnboarding";

export default function OnboardingStep1() {
  const router = useRouter();

  const [email, setEmail] = useState<string>("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      const status = await getOnboardingStatus();
      if (!alive) return;

      if (status.status === "no_user") {
        router.replace("/login");
        return;
      }

      if (status.status === "done") {
        router.replace("/dashboard");
        return;
      }

      const { data: userRes } = await supabase.auth.getUser();
      if (!alive) return;
      setEmail(userRes?.user?.email || "");
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  const canContinue =
    firstName.trim().length >= 2 &&
    lastName.trim().length >= 2 &&
    age &&
    !loading;

  async function handleContinue() {
    setErrorMsg(null);
    setLoading(true);

    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    const user = userRes?.user;

    if (userErr || !user) {
      router.push("/login");
      return;
    }

    // Create row early with required defaults for NOT NULL columns
    const { error } = await supabase.from("jr_user_profile").upsert(
      {
        user_id: user.id,
        onboarding_step: 1,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        age: age,

        // Defaults (will be refined later steps)
        sex: "na",
        goal_primary: "rebalance",
        diet_type: "balanced",
        cooking_level: "beginner",
        allergies: [],
        meal_style: [],
        kitchen_tools: [],
      },
      { onConflict: "user_id" }
    );

    if (error) {
      setLoading(false);
      setErrorMsg(error.message || "Impossible d’enregistrer. Réessaie.");
      return;
    }

    router.push("/onboarding/step-2");
  }

  return (
    <div className="max-w-xl mx-auto py-10 space-y-6">
      <h1 className="text-2xl font-semibold text-center">Création du profil</h1>

      {errorMsg ? (
        <div className="border border-red-200 bg-red-50 text-red-700 rounded-lg p-3">
          {errorMsg}
        </div>
      ) : null}

      <div className="space-y-3">
        <label className="block text-sm font-medium">Email</label>
        <input
          value={email}
          readOnly
          className="w-full border rounded-lg p-3 bg-gray-50"
        />
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium">Prénom</label>
        <input
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="w-full border rounded-lg p-3"
          placeholder="Ex : Nathanyel"
        />
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium">Nom</label>
        <input
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className="w-full border rounded-lg p-3"
          placeholder="Ex : Benchimol"
        />
      </div>

      <div className="space-y-3">
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
