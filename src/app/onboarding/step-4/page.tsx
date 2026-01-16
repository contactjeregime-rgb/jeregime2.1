"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getOnboardingStatus, requireStep } from "@/lib/requireOnboarding";

const DIET_PRIMARY = [
  { value: "balanced", label: "Équilibrée" },
  { value: "lowcarb", label: "Low carb" },
  { value: "vegetarian", label: "Végétarienne" },
];

const DIET_TAGS = [
  { value: "halal", label: "Halal" },
  { value: "no_pork", label: "Sans porc" },
  { value: "vegetarian", label: "Végétarien" },
];

const MEAL_STYLES = [
  { value: "simple", label: "Simple / rapide" },
  { value: "batch", label: "Batch cooking" },
  { value: "family", label: "Famille" },
  { value: "high_protein", label: "Protéiné" },
  { value: "light", label: "Léger" },
];

const GROCERY_BUDGETS = [
  { value: "small", label: "Petit budget" },
  { value: "medium", label: "Budget moyen" },
  { value: "large", label: "Budget confortable" },
];

const COOK_TIMES = [
  { value: "10", label: "≤ 10 min" },
  { value: "20", label: "≈ 20 min" },
  { value: "30plus", label: "30 min +" },
];

const KITCHEN_TOOLS = [
  { value: "four", label: "Four" },
  { value: "micro_ondes", label: "Micro-ondes" },
  { value: "poele", label: "Poêle" },
  { value: "casserole", label: "Casserole" },
  { value: "robot", label: "Robot" },
  { value: "mixeur", label: "Mixeur" },
  { value: "airfryer", label: "Airfryer" },
];

function Pill({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border rounded-lg px-4 py-3 text-left ${
        active ? "border-black" : "border-gray-300"
      }`}
    >
      {label}
    </button>
  );
}

export default function OnboardingStep4() {
  const router = useRouter();

  const [dietType, setDietType] = useState<string | null>(null);
  const [dietTags, setDietTags] = useState<string[]>([]);
  const [mealStyle, setMealStyle] = useState<string[]>([]);
  const [groceryBudget, setGroceryBudget] = useState<string | null>(null);
  const [cookTime, setCookTime] = useState<string | null>(null);
  const [kitchenTools, setKitchenTools] = useState<string[]>([]);

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

  function toggle(setter: (fn: (p: string[]) => string[]) => void, v: string) {
    setter((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  }

  const canContinue = useMemo(() => {
    return (
      !!dietType &&
      mealStyle.length > 0 &&
      !!groceryBudget &&
      !!cookTime &&
      kitchenTools.length > 0 &&
      !loading
    );
  }, [dietType, mealStyle, groceryBudget, cookTime, kitchenTools, loading]);

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
        diet_type: dietType,
        diet_tags: dietTags,
        meal_style: mealStyle,
        grocery_budget: groceryBudget,
        cook_time: cookTime,
        kitchen_tools: kitchenTools,
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
    <div className="max-w-xl mx-auto py-10 space-y-10">
      <h1 className="text-2xl font-semibold text-center">Alimentation & cuisine</h1>

      {errorMsg ? (
        <div className="border border-red-200 bg-red-50 text-red-700 rounded-lg p-3">
          {errorMsg}
        </div>
      ) : null}

      <div className="space-y-3">
        <h2 className="font-medium">Type principal</h2>
        <div className="grid grid-cols-2 gap-3">
          {DIET_PRIMARY.map((d) => (
            <Pill
              key={d.value}
              active={dietType === d.value}
              label={d.label}
              onClick={() => setDietType(d.value)}
            />
          ))}
        </div>
        <p className="text-xs text-gray-500">
          Le type principal sert de base aux recommandations. Tu peux ajouter des contraintes juste en dessous.
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="font-medium">Contraintes / préférences (choix multiple)</h2>
        <div className="grid grid-cols-2 gap-3">
          {DIET_TAGS.map((t) => (
            <Pill
              key={t.value}
              active={dietTags.includes(t.value)}
              label={t.label}
              onClick={() => toggle(setDietTags, t.value)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="font-medium">Style de repas (choix multiple)</h2>
        <div className="grid grid-cols-2 gap-3">
          {MEAL_STYLES.map((m) => (
            <Pill
              key={m.value}
              active={mealStyle.includes(m.value)}
              label={m.label}
              onClick={() => toggle(setMealStyle, m.value)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="font-medium">Budget courses</h2>
        <div className="grid grid-cols-3 gap-3">
          {GROCERY_BUDGETS.map((b) => (
            <Pill
              key={b.value}
              active={groceryBudget === b.value}
              label={b.label}
              onClick={() => setGroceryBudget(b.value)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="font-medium">Temps disponible pour cuisiner</h2>
        <div className="grid grid-cols-3 gap-3">
          {COOK_TIMES.map((t) => (
            <Pill
              key={t.value}
              active={cookTime === t.value}
              label={t.label}
              onClick={() => setCookTime(t.value)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="font-medium">Matériel disponible (choix multiple)</h2>
        <div className="grid grid-cols-2 gap-3">
          {KITCHEN_TOOLS.map((k) => (
            <Pill
              key={k.value}
              active={kitchenTools.includes(k.value)}
              label={k.label}
              onClick={() => toggle(setKitchenTools, k.value)}
            />
          ))}
        </div>
      </div>

      <button
        disabled={!canContinue}
        onClick={handleContinue}
        className="w-full bg-black text-white py-4 rounded-lg disabled:opacity-40"
      >
        {loading ? "Enregistrement…" : "Continuer"}
      </button>

      <p className="text-xs text-gray-500">
        Aucun champ libre : tout se fait par choix pour garder un profil propre et exploitable.
      </p>
    </div>
  );
}
