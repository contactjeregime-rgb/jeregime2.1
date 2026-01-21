"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

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

function SelectRow({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <select
        className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function toggle(setter: (fn: (p: string[]) => string[]) => void, v: string) {
  setter((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
}

// --- Enums DB (alignés sur les CHECK constraints) ---
const GOALS = [
  { value: "lose_weight", label: "Perdre du poids" },
  { value: "rebalance", label: "Rééquilibrage" },
  { value: "tone", label: "Tonicité" },
  { value: "habits_energy", label: "Habitudes & énergie" },
];

const ACTIVITY = [
  { value: "sedentary", label: "Sédentaire" },
  { value: "normal", label: "Normal" },
  { value: "active", label: "Actif" },
  { value: "very_active", label: "Très actif" },
];

const WORK = [
  { value: "sitting", label: "Assis" },
  { value: "standing", label: "Debout" },
  { value: "mixed", label: "Mixte" },
  { value: "shift", label: "Horaires décalés" },
];

const EATING_OUT = [
  { value: "rare", label: "Rare" },
  { value: "1_2_week", label: "1–2 / semaine" },
  { value: "3plus_week", label: "3+ / semaine" },
];

const ALCOHOL = [
  { value: "never", label: "Jamais" },
  { value: "1_2_week", label: "1–2 / semaine" },
  { value: "3plus_week", label: "3+ / semaine" },
];

const SMOKING = [
  { value: "no", label: "Non" },
  { value: "occasional", label: "Occasionnel" },
  { value: "daily", label: "Quotidien" },
];

const VAPING = [
  { value: "no", label: "Non" },
  { value: "yes", label: "Oui" },
];

const SLEEP_QUALITY = [
  { value: "good", label: "Bonne" },
  { value: "medium", label: "Moyenne" },
  { value: "bad", label: "Mauvaise" },
];

// --- Alimentation & cuisine ---
const DIET_PRIMARY = [
  { value: "balanced", label: "Équilibrée" },
  { value: "lowcarb", label: "Low carb" },
  { value: "vegetarian", label: "Végétarienne" },
  { value: "halal", label: "Halal (principal)" },
  { value: "no_pork", label: "Sans porc (principal)" },
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

const COOKING_LEVELS = [
  { value: "beginner", label: "Débutant" },
  { value: "intermediate", label: "Intermédiaire" },
  { value: "confident", label: "À l’aise" },
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

// --- Helpers options (menus) ---
const AGE_OPTIONS = Array.from({ length: 70 - 18 + 1 }, (_, i) => {
  const v = String(18 + i);
  return { value: v, label: v };
});

const HEIGHT_OPTIONS = Array.from({ length: 230 - 120 + 1 }, (_, i) => {
  const v = String(120 + i);
  return { value: v, label: `${v} cm` };
});

const WEIGHT_OPTIONS = Array.from({ length: 300 - 30 + 1 }, (_, i) => {
  const v = String(30 + i);
  return { value: v, label: `${v} kg` };
});

const TIME_OPTIONS = (() => {
  const out: Array<{ value: string; label: string }> = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      const label = `${hh}:${mm}`;
      const value = `${hh}:${mm}:00`;
      out.push({ value, label });
    }
  }
  return out;
})();

type ProfileRow = {
  onboarding_completed: boolean;

  first_name: string | null;
  last_name: string | null;

  age: number | null;
  sex: string | null;

  height_cm: number | null;
  weight_kg: number | null;
  target_weight_kg: number | null;

  goal_primary: string | null;
  activity_level: string | null;
  work_type: string | null;
  eating_out_freq: string | null;

  diet_type: string | null;
  diet_tags: string[] | null;
  allergies: string[] | null;
  meal_style: string[] | null;

  cooking_level: string | null;
  cook_time: string | null;
  grocery_budget: string | null;
  kitchen_tools: string[] | null;

  sleep_bedtime: string | null;
  sleep_wakeup: string | null;
  sleep_quality: string | null;

  alcohol_freq: string | null;
  smoking_status: string | null;
  vaping_status: string | null;
};

export default function ProfileEditPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Valeurs (menus utilisent string)
  const [age, setAge] = useState<string>("18");
  const [sex, setSex] = useState<string>("na");
  const [height, setHeight] = useState<string>("170");
  const [weight, setWeight] = useState<string>("70");
  const [targetWeight, setTargetWeight] = useState<string>("70");

  const [goal, setGoal] = useState<string>("rebalance");
  const [activity, setActivity] = useState<string>("sedentary");
  const [work, setWork] = useState<string>("sitting");
  const [eatingOut, setEatingOut] = useState<string>("rare");

  const [dietType, setDietType] = useState<string>("balanced");
  const [dietTags, setDietTags] = useState<string[]>([]);
  const [mealStyle, setMealStyle] = useState<string[]>([]);
  const [cookingLevel, setCookingLevel] = useState<string>("beginner");
  const [groceryBudget, setGroceryBudget] = useState<string>("medium");
  const [cookTime, setCookTime] = useState<string>("20");
  const [kitchenTools, setKitchenTools] = useState<string[]>([]);

  const [bedtime, setBedtime] = useState<string>("23:00:00");
  const [wakeup, setWakeup] = useState<string>("07:00:00");
  const [sleepQuality, setSleepQuality] = useState<string>("good");

  const [alcohol, setAlcohol] = useState<string>("never");
  const [smoking, setSmoking] = useState<string>("no");
  const [vaping, setVaping] = useState<string>("no");

  useEffect(() => {
    let alive = true;

    async function init() {
      setChecking(true);
      setErr(null);

      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes?.user;
      if (!user) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase
        .from("jr_user_profile")
        .select(
          [
            "onboarding_completed",
            "first_name",
            "last_name",
            "age",
            "sex",
            "height_cm",
            "weight_kg",
            "target_weight_kg",
            "goal_primary",
            "activity_level",
            "work_type",
            "eating_out_freq",
            "diet_type",
            "diet_tags",
            "allergies",
            "meal_style",
            "cooking_level",
            "cook_time",
            "grocery_budget",
            "kitchen_tools",
            "sleep_bedtime",
            "sleep_wakeup",
            "sleep_quality",
            "alcohol_freq",
            "smoking_status",
            "vaping_status",
          ].join(",")
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (!alive) return;

      if (error || !data?.onboarding_completed) {
        router.replace("/onboarding/step-1");
        return;
      }

      const p = data as ProfileRow;

      if (p.age != null) setAge(String(p.age));
      if (p.sex) setSex(p.sex);

      if (p.height_cm != null) setHeight(String(p.height_cm));
      if (p.weight_kg != null) setWeight(String(Math.round(Number(p.weight_kg))));
      if (p.target_weight_kg != null) setTargetWeight(String(Math.round(Number(p.target_weight_kg))));

      if (p.goal_primary) setGoal(p.goal_primary);
      if (p.activity_level) setActivity(p.activity_level);
      if (p.work_type) setWork(p.work_type);
      if (p.eating_out_freq) setEatingOut(p.eating_out_freq);

      if (p.diet_type) setDietType(p.diet_type);
      setDietTags(Array.isArray(p.diet_tags) ? p.diet_tags : []);
      setMealStyle(Array.isArray(p.meal_style) ? p.meal_style : []);
      setAllergies(Array.isArray(p.allergies) ? p.allergies : []);

      if (p.cooking_level) setCookingLevel(p.cooking_level);
      if (p.grocery_budget) setGroceryBudget(p.grocery_budget);
      if (p.cook_time) setCookTime(p.cook_time);
      setKitchenTools(Array.isArray(p.kitchen_tools) ? p.kitchen_tools : []);

      if (p.sleep_bedtime) setBedtime(p.sleep_bedtime);
      if (p.sleep_wakeup) setWakeup(p.sleep_wakeup);
      if (p.sleep_quality) setSleepQuality(p.sleep_quality);

      if (p.alcohol_freq) setAlcohol(p.alcohol_freq);
      if (p.smoking_status) setSmoking(p.smoking_status);
      if (p.vaping_status) setVaping(p.vaping_status);

      setChecking(false);
    }

    init();

    return () => {
      alive = false;
    };
  }, [router]);

  const canSave = useMemo(() => {
    return (
      !!age &&
      !!height &&
      !!weight &&
      !!targetWeight &&
      !!goal &&
      !!activity &&
      !!work &&
      !!eatingOut &&
      !!dietType &&
      mealStyle.length > 0 &&
      kitchenTools.length > 0 &&
      !!groceryBudget &&
      !!cookTime &&
      !!bedtime &&
      !!wakeup &&
      !!sleepQuality &&
      !!alcohol &&
      !!smoking &&
      !!vaping &&
      !saving
    );
  }, [
    age,
    height,
    weight,
    targetWeight,
    goal,
    activity,
    work,
    eatingOut,
    dietType,
    mealStyle,
    kitchenTools,
    groceryBudget,
    cookTime,
    bedtime,
    wakeup,
    sleepQuality,
    alcohol,
    smoking,
    vaping,
    saving,
  ]);

  async function save() {
    setErr(null);
    setMsg(null);
    setSaving(true);

    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (!user) {
      router.replace("/login");
      return;
    }

    const { error } = await supabase
      .from("jr_user_profile")
      .update({
        age: Number(age),
        sex,
        height_cm: Number(height),
        weight_kg: Number(weight),
        target_weight_kg: Number(targetWeight),

        goal_primary: goal,
        activity_level: activity,
        work_type: work,
        eating_out_freq: eatingOut,

        diet_type: dietType,
        diet_tags: dietTags,
        meal_style: mealStyle,
        grocery_budget: groceryBudget,
        cook_time: cookTime,
        kitchen_tools: kitchenTools,

        sleep_bedtime: bedtime,
        sleep_wakeup: wakeup,
        sleep_quality: sleepQuality,

        alcohol_freq: alcohol,
        smoking_status: smoking,
        vaping_status: vaping,
      })
      .eq("user_id", user.id);

    if (error) {
      setSaving(false);
      setErr(error.message || "Impossible d’enregistrer.");
      return;
    }

    setSaving(false);
    setMsg("Profil mis à jour.");
  }

  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 py-16 bg-zinc-50">
        <div className="text-zinc-700">Chargement…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-12 bg-white">
      <div className="max-w-3xl mx-auto space-y-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Modifier mes réponses</h1>
            <p className="mt-2 text-sm text-zinc-600">
              Mets à jour ton profil. Ton rapport restera stable tant que tu ne le régénères pas.
            </p>
          </div>
          <Link href="/dashboard" className="text-sm underline text-zinc-700">
            Retour dashboard
          </Link>
        </div>

        {err ? (
          <div className="border border-red-200 bg-red-50 text-red-700 rounded-lg p-3">{err}</div>
        ) : null}

        {msg ? (
          <div className="border border-green-200 bg-green-50 text-green-800 rounded-lg p-3">{msg}</div>
        ) : null}

        <section className="rounded-2xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-base font-semibold">Profil</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SelectRow label="Âge" value={age} onChange={setAge} options={AGE_OPTIONS} />
            <SelectRow
              label="Sexe"
              value={sex}
              onChange={setSex}
              options={[
                { value: "female", label: "Femme" },
                { value: "male", label: "Homme" },
                { value: "na", label: "Non précisé" },
              ]}
            />
            <SelectRow label="Taille" value={height} onChange={setHeight} options={HEIGHT_OPTIONS} />
            <SelectRow label="Poids" value={weight} onChange={setWeight} options={WEIGHT_OPTIONS} />
            <SelectRow label="Poids cible" value={targetWeight} onChange={setTargetWeight} options={WEIGHT_OPTIONS} />
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-base font-semibold">Objectif & rythme de vie</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SelectRow label="Objectif principal" value={goal} onChange={setGoal} options={GOALS} />
            <SelectRow label="Niveau d’activité" value={activity} onChange={setActivity} options={ACTIVITY} />
            <SelectRow label="Type de travail" value={work} onChange={setWork} options={WORK} />
            <SelectRow label="Repas à l’extérieur" value={eatingOut} onChange={setEatingOut} options={EATING_OUT} />
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 p-5 space-y-5">
          <h2 className="text-base font-semibold">Alimentation & cuisine</h2>

          <div className="space-y-3">
            <p className="font-medium">Type principal</p>
            <div className="grid grid-cols-2 gap-3">
              {DIET_PRIMARY.map((d) => (
                <Pill key={d.value} active={dietType === d.value} label={d.label} onClick={() => setDietType(d.value)} />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="font-medium">Contraintes / préférences (choix multiple)</p>
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
            <p className="font-medium">Style de repas (choix multiple)</p>
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SelectRow label="Niveau cuisine" value={cookingLevel} onChange={setCookingLevel} options={COOKING_LEVELS} />
            <SelectRow label="Temps cuisine" value={cookTime} onChange={setCookTime} options={COOK_TIMES} />
            <SelectRow label="Budget courses" value={groceryBudget} onChange={setGroceryBudget} options={GROCERY_BUDGETS} />
          </div>

          <div className="space-y-3">
            <p className="font-medium">Matériel (choix multiple)</p>
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

          <p className="text-xs text-gray-500">
            Allergies : gestion détaillée V1 via l’onboarding. (On l’ajoutera ici ensuite.)
          </p>
        </section>

        <section className="rounded-2xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-base font-semibold">Sommeil</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SelectRow label="Heure de coucher" value={bedtime} onChange={setBedtime} options={TIME_OPTIONS} />
            <SelectRow label="Heure de réveil" value={wakeup} onChange={setWakeup} options={TIME_OPTIONS} />
            <SelectRow label="Qualité du sommeil" value={sleepQuality} onChange={setSleepQuality} options={SLEEP_QUALITY} />
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-base font-semibold">Hygiène de vie</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SelectRow label="Alcool" value={alcohol} onChange={setAlcohol} options={ALCOHOL} />
            <SelectRow label="Tabac" value={smoking} onChange={setSmoking} options={SMOKING} />
            <SelectRow label="Vape" value={vaping} onChange={setVaping} options={VAPING} />
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={save}
            disabled={!canSave}
            className="rounded-lg bg-black text-white px-6 py-3 font-medium disabled:opacity-40"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>

          <Link href="/report" className="rounded-lg border border-zinc-300 px-6 py-3 font-medium">
            Consulter mon rapport
          </Link>

          <p className="text-xs text-zinc-500">
            Après modification : va sur /report puis clique “Régénérer & sauvegarder” si tu veux mettre à jour ton rapport.
          </p>
        </div>
      </div>
    </main>
  );
}
