"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function safeText(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  return null;
}

function listify(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean);
}

export default function AvisExpertChatPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coach, setCoach] = useState<any | null>(null);

  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);

      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes?.user;
      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: sessionRes, error: sessionErr } = await supabase.auth.getSession();
      const token = sessionRes?.session?.access_token ?? null;
      if (sessionErr || !token) {
        setError("Session invalide. Reconnecte-toi.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/ai-opinion", {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg = data?.error ?? "Erreur IA";
          if (msg === "No opinion yet") {
            // pas d'avis enregistré : on laisse l'UI proposer "Générer un nouvel avis"
            if (!cancelled) setCoach(null);
            return;
          }
          throw new Error(msg);
        }

        const payload = data as CoachApiResponse;
        if (!cancelled) setCoach((data as any)?.opinion_json ?? null);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Erreur IA");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function generateNewOpinion() {
    setGenerating(true);
    setError(null);

    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (!user) {
      router.replace("/login");
      setGenerating(false);
      return;
    }

    const { data: sessionRes, error: sessionErr } = await supabase.auth.getSession();
    const token = sessionRes?.session?.access_token ?? null;
    if (sessionErr || !token) {
      setError("Session invalide. Reconnecte-toi.");
      setGenerating(false);
      return;
    }

    try {
      const res = await fetch("/api/ai-opinion", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Erreur IA");

      setCoach((data as any)?.opinion_json ?? null);
    } catch (e: any) {
      setError(e?.message ?? "Erreur IA");
    } finally {
      setGenerating(false);
    }
  }

  const bubbles = useMemo(() => {
    if (!coach) return [];

    const headerTitle = safeText(coach?.header?.title) ?? "Compte rendu – Avis d’expert";
    const headerDate = safeText(coach?.header?.generated_at);

    const parts: { from: "doctor" | "user"; title?: string; text?: string; bullets?: string[] }[] = [];

    // Message d'ouverture “cabinet”
    parts.push({
      from: "doctor",
      title: headerTitle,
      text: headerDate ? `Synthèse du ${headerDate}.` : "Synthèse du jour.",
    });

    const salutation = safeText(coach?.salutation);
    if (salutation) {
      parts.push({ from: "doctor", text: salutation });
    }

    const context = safeText(coach?.context_and_professional);
    if (context) {
      parts.push({ from: "doctor", title: "Contexte", text: context });
    }

    const overall = safeText(coach?.clinical_summary?.overall_view);
    const bmi = safeText(coach?.clinical_summary?.bmi);
    const act = safeText(coach?.clinical_summary?.activity_level);
    const sleep = safeText(coach?.clinical_summary?.sleep_quality);

    const quick = [bmi && `IMC : ${bmi}`, act && `Activité : ${act}`, sleep && `Sommeil : ${sleep}`].filter(Boolean) as string[];
    if (overall || quick.length) {
      parts.push({
        from: "doctor",
        title: "Synthèse clinique",
        text: overall ?? undefined,
        bullets: quick,
      });
    }

    const fav = listify(coach?.clinical_factors?.favorable);
    const vig = listify(coach?.clinical_factors?.vigilance);
    if (fav.length) parts.push({ from: "doctor", title: "Points favorables", bullets: fav });
    if (vig.length) parts.push({ from: "doctor", title: "Points de vigilance", bullets: vig });

    const nut = safeText(coach?.nutrition_analysis?.overall_quality);
    const nutOrg = safeText(coach?.nutrition_analysis?.meal_organization);
    const nutConstraints = safeText(coach?.nutrition_analysis?.practical_constraints);
    const nutCoherence = safeText(coach?.nutrition_analysis?.coherence_with_goal);

    const nutLines = [nutOrg, nut, nutConstraints, nutCoherence].filter(Boolean) as string[];
    if (nutLines.length) {
      parts.push({ from: "doctor", title: "Analyse nutritionnelle", bullets: nutLines });
    }

    const lifeAct = safeText(coach?.lifestyle_analysis?.physical_activity);
    const lifeRhythm = safeText(coach?.lifestyle_analysis?.daily_rhythm);
    const lifeSleep = safeText(coach?.lifestyle_analysis?.sleep);
    const lifeLines = [lifeAct, lifeRhythm, lifeSleep].filter(Boolean) as string[];
    if (lifeLines.length) parts.push({ from: "doctor", title: "Analyse mode de vie", bullets: lifeLines });

    const axes = listify(coach?.priority_axes);
    if (axes.length) parts.push({ from: "doctor", title: "Axes prioritaires", bullets: axes });

    const reco = safeText(coach?.follow_up_recommendations);
    if (reco) parts.push({ from: "doctor", title: "Recommandations", text: reco });

    const concl = safeText(coach?.professional_conclusion);
    if (concl) parts.push({ from: "doctor", title: "Conclusion", text: concl });

    const frame = safeText(coach?.jr_frame);
    if (frame) parts.push({ from: "doctor", text: frame });

    return parts;
  }, [coach]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-gray-200 p-5">
          <div>
            <p className="text-xs font-medium tracking-wide text-gray-500">JE RÉGIME · CABINET</p>
            <h1 className="mt-1 text-lg font-semibold">Avis d’expert</h1>
          </div>
          <Link href="/report" className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50">
            ← Retour rapport
          </Link>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <p className="text-sm text-gray-700 font-medium">Le diététicien analyse ton dossier…</p>
              <p className="mt-1 text-sm text-gray-600">Quelques secondes.</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
              <p className="text-sm font-medium text-red-900">Erreur</p>
              <p className="mt-2 text-sm text-red-800">{error}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header “médecin” */}
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full border border-gray-200 bg-gray-50 flex items-center justify-center text-sm font-semibold">
                  Dr
                </div>
                <div>
                  <p className="text-sm font-semibold">Dr JeRegime</p>
                  <p className="text-xs text-gray-500">Diététique & prévention métabolique</p>
                </div>
              </div>

              {/* Si aucun avis enregistré, proposer de le générer */}
              {!coach ? (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                  <p className="text-sm font-medium text-gray-800">Aucun avis enregistré pour l’instant.</p>
                  <p className="mt-1 text-sm text-gray-600">
                    Clique ci-dessous pour générer l’avis du diététicien à partir de ton rapport.
                  </p>
                  <button
                    type="button"
                    onClick={generateNewOpinion}
                    disabled={generating}
                    className="mt-4 rounded-xl bg-black px-6 py-3 text-sm font-medium text-white disabled:opacity-60"
                  >
                    {generating ? "Génération…" : "Générer un nouvel avis"}
                  </button>
                </div>
              ) : null}

              {/* Bulles */}
              <div className="space-y-3">
                {bubbles.map((b, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="h-8 w-8 shrink-0 rounded-full border border-gray-200 bg-gray-50 flex items-center justify-center text-xs font-semibold">
                      Dr
                    </div>
                    <div className="w-full rounded-2xl border border-gray-200 bg-white p-4">
                      {b.title ? <p className="text-sm font-semibold">{b.title}</p> : null}
                      {b.text ? <p className="mt-2 text-sm text-gray-700">{b.text}</p> : null}
                      {b.bullets?.length ? (
                        <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-gray-700">
                          {b.bullets.map((x, idx) => (
                            <li key={idx}>{x}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs text-gray-600">
                  Cet avis s’appuie sur ton rapport sauvegardé. Pour modifier les données, reviens au rapport puis “Modifier mes réponses”.
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href="/report"
                  className="rounded-xl bg-black px-6 py-3 text-sm font-medium text-white"
                >
                  Consulter mon rapport
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
