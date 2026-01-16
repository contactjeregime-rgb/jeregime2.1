"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getOnboardingStatus } from "@/lib/requireOnboarding";

type Profile = {
  first_name: string | null;
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
  onboarding_completed: boolean | null;
};

type ReportRow = {
  id: string;
  user_id: string;
  report_version: number;
  report_json: any;
  created_at: string;
  updated_at: string;
};

type ReportJsonV1 = {
  version: 1;
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
  goals: {
    goal_primary: string | null;
  };
  lifestyle: {
    activity_level: string | null;
    work_type: string | null;
    eating_out_freq: string | null;
    sleep_bedtime: string | null;
    sleep_wakeup: string | null;
    sleep_quality: string | null;
    alcohol_freq: string | null;
    smoking_status: string | null;
  };
  nutrition: {
    diet_type: string | null;
    allergies: string[] | null;
    meal_style: string[] | null;
    cooking_level: string | null;
    cook_time: string | null;
    grocery_budget: string | null;
    kitchen_tools: string[] | null;
  };
  summary: {
    title: string;
    bullets: string[];
    note: string;
  };
};

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

function isReportJsonV1(v: any): v is ReportJsonV1 {
  return v && typeof v === "object" && v.version === 1 && typeof v.generated_at === "string";
}

export default function ReportPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [checkingExisting, setCheckingExisting] = useState(true);

  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [existingRow, setExistingRow] = useState<ReportRow | null>(null);
  const [report, setReport] = useState<ReportJsonV1 | null>(null);

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

      // status === "done"
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes?.user;

      // Debug utile (visible dans console navigateur)
      console.log("[/report] user from supabase.auth.getUser()", user ? { id: user.id, email: user.email } : null);

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data, error: profErr } = await supabase
        .from("jr_user_profile")
        .select(
          [
            "first_name",
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
            "onboarding_completed",
          ].join(",")
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (profErr || !data) {
        console.log("[/report] profile load error", profErr);
        setError("Impossible de charger ton profil. Réessaie dans quelques secondes.");
        setLoading(false);
        return;
      }

      if (!data.onboarding_completed) {
        router.replace("/onboarding");
        return;
      }

      setProfile(data as Profile);
      setLoading(false);
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const computedReport = useMemo<ReportJsonV1 | null>(() => {
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
      version: 1,
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
      goals: {
        goal_primary: profile.goal_primary ?? null,
      },
      lifestyle: {
        activity_level: profile.activity_level ?? null,
        work_type: profile.work_type ?? null,
        eating_out_freq: profile.eating_out_freq ?? null,
        sleep_bedtime: profile.sleep_bedtime ?? null,
        sleep_wakeup: profile.sleep_wakeup ?? null,
        sleep_quality: profile.sleep_quality ?? null,
        alcohol_freq: profile.alcohol_freq ?? null,
        smoking_status: profile.smoking_status ?? null,
      },
      nutrition: {
        diet_type: profile.diet_type ?? null,
        allergies: profile.allergies ?? null,
        meal_style: profile.meal_style ?? null,
        cooking_level: profile.cooking_level ?? null,
        cook_time: profile.cook_time ?? null,
        grocery_budget: profile.grocery_budget ?? null,
        kitchen_tools: profile.kitchen_tools ?? null,
      },
      summary: {
        title: "Synthèse de ton profil (V1)",
        bullets: bullets.length ? bullets : ["Profil chargé. Nous allons affiner les recommandations ensuite."],
        note,
      },
    };
  }, [profile]);

  // Charger un rapport existant en DB (si présent)
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
        .maybeSingle();

      if (cancelled) return;

      if (rErr) {
        console.log("[/report] existing report load error", rErr);
        // pas bloquant: on peut quand même générer
        setExistingRow(null);
        setCheckingExisting(false);
        return;
      }

      if (data && isReportJsonV1((data as any).report_json)) {
        setExistingRow(data as ReportRow);
        setReport((data as any).report_json as ReportJsonV1);
      } else {
        setExistingRow(null);
        setReport(null);
      }

      setCheckingExisting(false);
    }

    loadExisting();

    return () => {
      cancelled = true;
    };
  }, [profile, router]);

  async function saveReportNow() {
    if (!computedReport) return;

    setSaving(true);
    setSaveOk(null);
    setError(null);

    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;

    console.log("[/report] saveReportNow user", user ? { id: user.id, email: user.email } : null);

    if (!user) {
      router.replace("/login");
      return;
    }

    const payload = {
      user_id: user.id,
      report_version: 1,
      report_json: computedReport,
    };

    const { data, error: upsertErr } = await supabase
      .from("jr_user_report")
      .upsert(payload, { onConflict: "user_id" })
      .select("id,user_id,report_version,report_json,created_at,updated_at")
      .maybeSingle();

    if (upsertErr) {
      console.log("[/report] upsert error", upsertErr);
      setError(
        "Impossible de sauvegarder ton rapport (sécurité/RLS). " +
          "Vérifie que tu es bien connecté et réessaie."
      );
      setSaving(false);
      return;
    }

    if (data && isReportJsonV1((data as any).report_json)) {
      setExistingRow(data as ReportRow);
      setReport((data as any).report_json as ReportJsonV1);
      setSaveOk("Rapport sauvegardé.");
    } else {
      setReport(computedReport);
      setSaveOk("Rapport généré (sauvegarde confirmée).");
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
              Retour dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const r = report ?? computedReport;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium tracking-wide text-gray-500">JE RÉGIME · RAPPORT PERSONNALISÉ</p>
          <h1 className="text-2xl font-semibold">
            {r?.identity.first_name ? `Rapport de ${r.identity.first_name}` : "Ton rapport personnalisé"}
          </h1>
          <p className="text-sm text-gray-600">
            Version V1 ·{" "}
            {r
              ? `Généré le ${new Date(r.generated_at).toLocaleString("fr-FR", {
                  dateStyle: "long",
                  timeStyle: "short",
                })}`
              : "—"}
          </p>

          {checkingExisting ? (
            <p className="text-xs text-gray-500">Vérification du rapport existant…</p>
          ) : existingRow ? (
            <p className="text-xs text-gray-500">
              Rapport déjà présent en base (maj:{" "}
              {new Date(existingRow.updated_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })})
            </p>
          ) : (
            <p className="text-xs text-gray-500">Aucun rapport sauvegardé pour l’instant.</p>
          )}
        </div>

        <div className="mt-6 grid gap-4">
          <section className="rounded-2xl border border-gray-200 p-5">
            <h2 className="text-base font-semibold">Synthèse</h2>
            <p className="mt-2 text-sm text-gray-700">{r?.summary.title}</p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-gray-700">
              {(r?.summary.bullets ?? []).map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-gray-600">{r?.summary.note}</p>
          </section>

          <section className="rounded-2xl border border-gray-200 p-5">
            <h2 className="text-base font-semibold">Indicateurs</h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs font-medium text-gray-500">Taille</p>
                <p className="mt-1 text-sm font-semibold">
                  {r?.metrics.height_cm != null ? `${r.metrics.height_cm} cm` : "—"}
                </p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs font-medium text-gray-500">Poids</p>
                <p className="mt-1 text-sm font-semibold">
                  {r?.metrics.weight_kg != null ? `${r.metrics.weight_kg} kg` : "—"}
                </p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs font-medium text-gray-500">Objectif</p>
                <p className="mt-1 text-sm font-semibold">
                  {r?.metrics.target_weight_kg != null ? `${r.metrics.target_weight_kg} kg` : "—"}
                </p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs font-medium text-gray-500">IMC</p>
                <p className="mt-1 text-sm font-semibold">
                  {r?.metrics.bmi != null ? `${r.metrics.bmi} (${r.metrics.bmi_category})` : "—"}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 p-5">
            <h2 className="text-base font-semibold">Habitudes & contraintes</h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs font-medium text-gray-500">Activité</p>
                <p className="mt-1 text-sm font-semibold">{r?.lifestyle.activity_level ?? "—"}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs font-medium text-gray-500">Travail</p>
                <p className="mt-1 text-sm font-semibold">{r?.lifestyle.work_type ?? "—"}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs font-medium text-gray-500">Repas extérieur</p>
                <p className="mt-1 text-sm font-semibold">{r?.lifestyle.eating_out_freq ?? "—"}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs font-medium text-gray-500">Sommeil</p>
                <p className="mt-1 text-sm font-semibold">
                  {r?.lifestyle.sleep_bedtime && r?.lifestyle.sleep_wakeup
                    ? `${r.lifestyle.sleep_bedtime} → ${r.lifestyle.sleep_wakeup}`
                    : "—"}
                </p>
                <p className="mt-1 text-xs text-gray-600">Qualité : {r?.lifestyle.sleep_quality ?? "—"}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs font-medium text-gray-500">Alcool</p>
                <p className="mt-1 text-sm font-semibold">{r?.lifestyle.alcohol_freq ?? "—"}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs font-medium text-gray-500">Tabac</p>
                <p className="mt-1 text-sm font-semibold">{r?.lifestyle.smoking_status ?? "—"}</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 p-5">
            <h2 className="text-base font-semibold">Alimentation & cuisine</h2>
            <div className="mt-3 grid grid-cols-1 gap-3">
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs font-medium text-gray-500">Type d’alimentation</p>
                <p className="mt-1 text-sm font-semibold">{r?.nutrition.diet_type ?? "—"}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs font-medium text-gray-500">Allergies</p>
                <p className="mt-1 text-sm font-semibold">{safeJoin(r?.nutrition.allergies)}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs font-medium text-gray-500">Style de repas</p>
                <p className="mt-1 text-sm font-semibold">{safeJoin(r?.nutrition.meal_style)}</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs font-medium text-gray-500">Niveau cuisine</p>
                  <p className="mt-1 text-sm font-semibold">{r?.nutrition.cooking_level ?? "—"}</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs font-medium text-gray-500">Temps cuisine</p>
                  <p className="mt-1 text-sm font-semibold">{r?.nutrition.cook_time ?? "—"}</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs font-medium text-gray-500">Budget courses</p>
                  <p className="mt-1 text-sm font-semibold">{r?.nutrition.grocery_budget ?? "—"}</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs font-medium text-gray-500">Matériel</p>
                  <p className="mt-1 text-sm font-semibold">{safeJoin(r?.nutrition.kitchen_tools)}</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            onClick={saveReportNow}
            disabled={saving || !computedReport}
            className="rounded-xl bg-black px-6 py-3 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? "Sauvegarde…" : "Sauvegarder le rapport"}
          </button>

          <Link href="/dashboard" className="rounded-xl border border-gray-300 px-6 py-3 text-sm font-medium">
            Aller au dashboard
          </Link>

          {saveOk ? <p className="text-sm text-green-700">{saveOk}</p> : null}

          <p className="w-full text-xs text-gray-500">
            Le rapport est stocké dans ta base et protégé par RLS (accès propriétaire uniquement).
          </p>
        </div>
      </div>
    </main>
  );
}
