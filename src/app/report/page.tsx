"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getOnboardingStatus } from "@/lib/requireOnboarding";

type Profile = {
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

  onboarding_completed: boolean | null;
};

type ReportRow = {
  id: string;
  user_id: string;
  report_version: number;
  report_json: unknown;
  created_at: string;
  updated_at: string;
};

type ReportJsonV1 = {
  version: 1 | 2;
  generated_at: string;
  identity: {
    first_name: string | null;
    age: number | null;
    sex: string | null;
  };
  metrics: {
    height_cm: number | null;
    weight_kg: number | null;
    target_weight_kg: number | null;
    bmi: number | null;
    bmi_category: string | null;
  };
  goals: { goal_primary: string | null };
  lifestyle: {
    activity_level: string | null;
    work_type: string | null;
    eating_out_freq: string | null;
    sleep_bedtime: string | null;
    sleep_wakeup: string | null;
    sleep_quality: string | null;
    alcohol_freq: string | null;
    smoking_status: string | null;
    vaping_status?: string | null;
  };
  nutrition: {
    diet_type: string | null;
    diet_tags: string[] | null;
    allergies: string[] | null;
    meal_style: string[] | null;
    cooking_level: string | null;
    cook_time: string | null;
    grocery_budget: string | null;
    kitchen_tools: string[] | null;
  };
  onboarding_snapshot?: unknown;
  suivi_quotidien?: unknown;
      summary: {
    title: string;
    bullets: string[];
    note: string;
  };
};

type ReportJsonV2 = ReportJsonV1 & {
  version: 2;
  onboarding_snapshot: {
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
  suivi_quotidien: {
    verdict: "recommended" | "optional";
    why: string;
    what_you_get: string[];
    closing: string;
  };
};

type ReportJson = ReportJsonV1 | ReportJsonV2;

function isReportJsonV2(v: unknown): v is ReportJsonV2 {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return o.version === 2 && typeof o.generated_at === "string";
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function computeBmi(heightCm: number, weightKg: number) {
  const h = heightCm / 100;
  if (!h || h <= 0) return null;
  return weightKg / (h * h);
}

function bmiCategory(bmi: number) {
  if (bmi < 18.5) return "Insuffisance pondérale";
  if (bmi < 25) return "Corpulence normale";
  if (bmi < 30) return "Surpoids";
  if (bmi < 35) return "Obésité (classe I)";
  if (bmi < 40) return "Obésité (classe II)";
  return "Obésité (classe III)";
}

function safeJoin(arr: string[] | null | undefined) {
  if (!arr || arr.length === 0) return "—";
  return arr.join(", ");
}

function isReportJsonV1(v: unknown): v is ReportJsonV1 {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return o.version === 1 && typeof o.generated_at === "string";
}

export default function ReportPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [checkingExisting, setCheckingExisting] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState<Profile | null>(null);

  // Rapport sauvegardé (stable)
  const [existingRow, setExistingRow] = useState<ReportRow | null>(null);
  const [savedReport, setSavedReport] = useState<ReportJson | null>(null);

  const computedReport = useMemo<ReportJsonV2 | null>(() => {
    if (!profile) return null;

    const h = profile.height_cm ?? null;
    const w = profile.weight_kg ?? null;

    const bmiRaw = h && w ? computeBmi(h, w) : null;
    const bmi = bmiRaw ? round1(bmiRaw) : null;
    const cat = bmi != null ? bmiCategory(bmi) : null;

    const bullets: string[] = [];
    if (bmi != null && cat) bullets.push(`IMC estimé : ${bmi} — ${cat}.`);
    if (profile.goal_primary) bullets.push(`Objectif principal : ${profile.goal_primary}.`);
    if (profile.activity_level) bullets.push(`Niveau d’activité : ${profile.activity_level}.`);
    if (profile.eating_out_freq) bullets.push(`Repas à l’extérieur : ${profile.eating_out_freq}.`);
    if (profile.diet_type) bullets.push(`Préférence alimentaire : ${profile.diet_type}.`);

    const note =
      "Ce rapport est une base de travail V1. Il sert à lancer un accompagnement structuré et cohérent. " +
      "Il ne remplace pas un avis médical, mais il pose un cadre clair, réaliste et personnalisable.";

    return {
      version: 2,
      generated_at: new Date().toISOString(),
      identity: {
        first_name: profile.first_name ?? null,
        age: profile.age ?? null,
        sex: profile.sex ?? null,
      },
      metrics: {
        height_cm: profile.height_cm ?? null,
        weight_kg: profile.weight_kg ?? null,
        target_weight_kg: profile.target_weight_kg ?? null,
        bmi,
        bmi_category: cat,
      },
      goals: { goal_primary: profile.goal_primary ?? null },
      lifestyle: {
        activity_level: profile.activity_level ?? null,
        work_type: profile.work_type ?? null,
        eating_out_freq: profile.eating_out_freq ?? null,
        sleep_bedtime: profile.sleep_bedtime ?? null,
        sleep_wakeup: profile.sleep_wakeup ?? null,
        sleep_quality: profile.sleep_quality ?? null,
        alcohol_freq: profile.alcohol_freq ?? null,
        smoking_status: profile.smoking_status ?? null,
        vaping_status: profile.vaping_status ?? null,
      },
      nutrition: {
        diet_type: profile.diet_type ?? null,
        diet_tags: Array.isArray(profile.diet_tags) ? profile.diet_tags : null,
        allergies: profile.allergies ?? null,
        meal_style: profile.meal_style ?? null,
        cooking_level: profile.cooking_level ?? null,
        cook_time: profile.cook_time ?? null,
        grocery_budget: profile.grocery_budget ?? null,
        kitchen_tools: profile.kitchen_tools ?? null,
      },
      onboarding_snapshot: {
        first_name: profile.first_name ?? null,
        last_name: profile.last_name ?? null,
        age: profile.age ?? null,
        sex: profile.sex ?? null,
        height_cm: profile.height_cm ?? null,
        weight_kg: profile.weight_kg ?? null,
        target_weight_kg: profile.target_weight_kg ?? null,
        goal_primary: profile.goal_primary ?? null,
        activity_level: profile.activity_level ?? null,
        work_type: profile.work_type ?? null,
        eating_out_freq: profile.eating_out_freq ?? null,
        diet_type: profile.diet_type ?? null,
        diet_tags: Array.isArray(profile.diet_tags) ? profile.diet_tags : null,
        allergies: profile.allergies ?? null,
        meal_style: profile.meal_style ?? null,
        cooking_level: profile.cooking_level ?? null,
        cook_time: profile.cook_time ?? null,
        grocery_budget: profile.grocery_budget ?? null,
        kitchen_tools: profile.kitchen_tools ?? null,
        sleep_bedtime: profile.sleep_bedtime ?? null,
        sleep_wakeup: profile.sleep_wakeup ?? null,
        sleep_quality: profile.sleep_quality ?? null,
        alcohol_freq: profile.alcohol_freq ?? null,
        smoking_status: profile.smoking_status ?? null,
        vaping_status: profile.vaping_status ?? null,
      },
      suivi_quotidien: {
        verdict: "recommended",
        why: "Votre bilan met en evidence plusieurs leviers a piloter en parallele (alimentation, rythme, activite, habitudes). Sans cadre quotidien, on revient vite aux automatismes.",
        what_you_get: [
          "Un coach dans votre poche pour vous guider au quotidien",
          "Aide immediate en cas de craquage (recentrage, alternatives, plan d action)",
          "Idees concretes : quoi manger, quoi acheter, quoi cuisiner selon vos contraintes",
          "Ajustements progressifs, realistes, et suivis dans la duree",
        ],
        closing: "Votre rapport a ete analyse et structure. La prochaine etape logique est un accompagnement nutritionnel quotidien JeRegime pour transformer ces recommandations en habitudes durables.",
      },
      summary: {
        title: "Synthese de ton profil (V2)",
        bullets: bullets.length ? bullets : ["Profil chargé. Nous allons affiner les recommandations ensuite."],
        note,
      },
    };
  }, [profile]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);

      const status = await getOnboardingStatus();
      if (cancelled) return;

      if (status.status === "no_user") {
        router.replace("/login");
        return;
      }
      if (status.status === "in_progress") {
        router.replace(`/onboarding/step-${status.step}`);
        return;
      }

      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes?.user;
      if (!user) {
        router.replace("/login");
        return;
      }

      const { data, error: profErr } = await supabase
        .from("jr_user_profile")
        .select(
          [
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
            "onboarding_completed",
          ].join(",")
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (profErr || !data) {
        setError("Impossible de charger ton profil. Réessaie dans quelques secondes.");
        setLoading(false);
        return;
      }

      if (!(data as unknown as Profile).onboarding_completed) {
        router.replace("/onboarding");
        return;
      }

      setProfile(data as unknown as Profile);
      setLoading(false);
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    async function loadExisting() {
      if (!profile) return;

      setCheckingExisting(true);
      setError(null);

      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes?.user;
      if (!user) {
        router.replace("/login");
        return;
      }

      const { data, error: rErr } = await supabase
        .from("jr_user_report")
        .select("id,user_id,report_version,report_json,created_at,updated_at")
        .eq("user_id", user.id)
        .returns<ReportRow>()
        .maybeSingle();

      if (cancelled) return;

      if (rErr) {
        setExistingRow(null);
        setSavedReport(null);
        setCheckingExisting(false);
        return;
      }

      const row = (data as unknown as ReportRow | null);

      if (row && (isReportJsonV2(row.report_json) || isReportJsonV1(row.report_json))) {
        setExistingRow(row);
        setSavedReport(row.report_json as ReportJson);
      } else {
        setExistingRow(null);
        setSavedReport(null);
      }

      setCheckingExisting(false);
    }

    loadExisting();

    return () => {
      cancelled = true;
    };
  }, [profile, router]);

  async function regenerateAndSave() {
    if (!computedReport) return;

    setSaving(true);
    setError(null);

    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (!user) {
      router.replace("/login");
      return;
    }

    const payload = {
      user_id: user.id,
      report_version: 2,
      report_json: computedReport,
    };

    const { data, error: upsertErr } = await supabase
      .from("jr_user_report")
      .upsert(payload, { onConflict: "user_id" })
      .select("id,user_id,report_version,report_json,created_at,updated_at")
      .returns<ReportRow>()
      .maybeSingle();

    if (upsertErr) {
      setError("Impossible de sauvegarder ton rapport. Réessaie.");
      setSaving(false);
      return;
    }

    const row = (data as unknown as ReportRow | null);

    if (row && (isReportJsonV2(row.report_json) || isReportJsonV1(row.report_json))) {
      setExistingRow(row);
      setSavedReport(row.report_json as ReportJson);
    } else {
      setSavedReport(computedReport);
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-600">Chargement du rapport…</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold">On a un problème</h1>
          <p className="mt-2 text-sm text-gray-700">{error}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => router.refresh()}
              className="rounded-xl bg-black px-5 py-3 text-sm font-medium text-white"
            >
              Réessayer
            </button>
            <Link
              href="/dashboard"
              className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium"
            >
              Aller au dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const displayed = savedReport ?? computedReport;
  const isPreview = !savedReport;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium tracking-wide text-gray-500">JE RÉGIME · RAPPORT PERSONNALISÉ</p>

          <h1 className="text-2xl font-semibold">
            {displayed?.identity.first_name ? `Rapport de ${displayed.identity.first_name}` : "Ton rapport personnalisé"}
          </h1>

          {checkingExisting ? (
            <p className="text-xs text-gray-500">Vérification du rapport existant…</p>
          ) : existingRow ? (
            <p className="text-xs text-gray-500">
              Rapport sauvegardé (maj:{" "}
              {new Date(existingRow.updated_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })})
            </p>
          ) : (
            <p className="text-xs text-gray-500">Aucun rapport sauvegardé pour l’instant.</p>
          )}

          {isPreview ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-900 font-medium">Aperçu (non sauvegardé)</p>
              <p className="text-sm text-amber-800 mt-1">
                Ton profil a changé. Clique sur <span className="font-medium">“Régénérer & sauvegarder”</span> pour
                enregistrer une nouvelle version du rapport.
              </p>
            </div>
          ) : null}
        </div>

        <div className="mt-6 grid gap-4">
          <section className="rounded-2xl border border-gray-200 p-5">
            <h2 className="text-base font-semibold">Synthèse</h2>
            <p className="mt-2 text-sm text-gray-700">{displayed?.summary.title}</p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-gray-700">
              {(displayed?.summary.bullets ?? []).map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-gray-600">{displayed?.summary.note}</p>
          </section>

          <section className="rounded-2xl border border-gray-200 p-5">
            <h2 className="text-base font-semibold">Indicateurs</h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs font-medium text-gray-500">Taille</p>
                <p className="mt-1 text-sm font-semibold">
                  {displayed?.metrics.height_cm != null ? `${displayed.metrics.height_cm} cm` : "—"}
                </p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs font-medium text-gray-500">Poids</p>
                <p className="mt-1 text-sm font-semibold">
                  {displayed?.metrics.weight_kg != null ? `${displayed.metrics.weight_kg} kg` : "—"}
                </p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs font-medium text-gray-500">Objectif</p>
                <p className="mt-1 text-sm font-semibold">
                  {displayed?.metrics.target_weight_kg != null ? `${displayed.metrics.target_weight_kg} kg` : "—"}
                </p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs font-medium text-gray-500">IMC</p>
                <p className="mt-1 text-sm font-semibold">
                  {displayed?.metrics.bmi != null
                    ? `${displayed.metrics.bmi} (${displayed.metrics.bmi_category})`
                    : "—"}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 p-5">
            <h2 className="text-base font-semibold">Habitudes & contraintes</h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs font-medium text-gray-500">Activité</p>
                <p className="mt-1 text-sm font-semibold">{displayed?.lifestyle.activity_level ?? "—"}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs font-medium text-gray-500">Travail</p>
                <p className="mt-1 text-sm font-semibold">{displayed?.lifestyle.work_type ?? "—"}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs font-medium text-gray-500">Repas extérieur</p>
                <p className="mt-1 text-sm font-semibold">{displayed?.lifestyle.eating_out_freq ?? "—"}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs font-medium text-gray-500">Sommeil</p>
                <p className="mt-1 text-sm font-semibold">
                  {displayed?.lifestyle.sleep_bedtime && displayed?.lifestyle.sleep_wakeup
                    ? `${displayed.lifestyle.sleep_bedtime} → ${displayed.lifestyle.sleep_wakeup}`
                    : "—"}
                </p>
                <p className="mt-1 text-xs text-gray-600">Qualité : {displayed?.lifestyle.sleep_quality ?? "—"}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs font-medium text-gray-500">Alcool</p>
                <p className="mt-1 text-sm font-semibold">{displayed?.lifestyle.alcohol_freq ?? "—"}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs font-medium text-gray-500">Tabac</p>
                <p className="mt-1 text-sm font-semibold">{displayed?.lifestyle.smoking_status ?? "—"}</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 p-5">
            <h2 className="text-base font-semibold">Alimentation & cuisine</h2>
            <div className="mt-3 grid grid-cols-1 gap-3">
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs font-medium text-gray-500">Type d’alimentation</p>
                <p className="mt-1 text-sm font-semibold">{displayed?.nutrition.diet_type ?? "—"}</p>
              </div>

              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs font-medium text-gray-500">Contraintes / préférences</p>
                <p className="mt-1 text-sm font-semibold">{safeJoin(displayed?.nutrition.diet_tags ?? null)}</p>
              </div>

              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs font-medium text-gray-500">Allergies</p>
                <p className="mt-1 text-sm font-semibold">{safeJoin(displayed?.nutrition.allergies)}</p>
              </div>

              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs font-medium text-gray-500">Style de repas</p>
                <p className="mt-1 text-sm font-semibold">{safeJoin(displayed?.nutrition.meal_style)}</p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs font-medium text-gray-500">Niveau cuisine</p>
                  <p className="mt-1 text-sm font-semibold">{displayed?.nutrition.cooking_level ?? "—"}</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs font-medium text-gray-500">Temps cuisine</p>
                  <p className="mt-1 text-sm font-semibold">{displayed?.nutrition.cook_time ?? "—"}</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs font-medium text-gray-500">Budget courses</p>
                  <p className="mt-1 text-sm font-semibold">{displayed?.nutrition.grocery_budget ?? "—"}</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs font-medium text-gray-500">Matériel</p>
                  <p className="mt-1 text-sm font-semibold">{safeJoin(displayed?.nutrition.kitchen_tools)}</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          {!savedReport ? (
            <button
              onClick={regenerateAndSave}
              disabled={saving || !computedReport}
              className="rounded-xl bg-black px-6 py-3 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving ? "Sauvegarde…" : "Régénérer & sauvegarder"}
            </button>
          ) : (
            <Link
              href="/dashboard/profile"
              className="rounded-xl bg-black px-6 py-3 text-sm font-medium text-white"
            >
              Modifier mes réponses
            </Link>
          )}

          <Link href="/dashboard" className="rounded-xl border border-gray-300 px-6 py-3 text-sm font-medium">
            Aller au dashboard
          </Link>

          {savedReport ? <p className="text-sm text-green-700">Votre rapport est enregistré</p> : null}

          <p className="w-full text-xs text-gray-500">
            Le rapport sauvegardé reste stable. Il ne change que lorsque tu cliques sur “Régénérer & sauvegarder”.
          </p>
        </div>
      </div>
    </main>
  );
}
