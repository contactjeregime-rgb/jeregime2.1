"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type ProfileRow = {
  onboarding_completed: boolean | null;
  is_premium: boolean | null;
};

type CreditsRow = {
  vision_credits: number | null;
};

type ApiOk = {
  ok: true;
  is_premium: boolean;
  credits_left: number | null;
  image_b64: string;
  disclaimer: string;
};

type ApiErr = {
  error?: string;
  message?: string;
};

export default function VisionBodyPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [isPremium, setIsPremium] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [resultB64, setResultB64] = useState<string | null>(null);
  const [disclaimer, setDisclaimer] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function init() {
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes?.user;

      if (!alive) return;

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("jr_user_profile")
        .select("onboarding_completed,is_premium")
        .eq("user_id", user.id)
        .maybeSingle<ProfileRow>();

      if (!alive) return;

      if (!profile?.onboarding_completed) {
        router.replace("/onboarding/step-1");
        return;
      }

      setIsPremium(Boolean(profile?.is_premium));

      const { data: cRow } = await supabase
        .from("jr_user_credits")
        .select("vision_credits")
        .eq("user_id", user.id)
        .maybeSingle<CreditsRow>();

      if (!alive) return;

      setCredits(typeof cRow?.vision_credits === "number" ? cRow.vision_credits : null);
      setLoading(false);
    }

    init();
    return () => {
      alive = false;
    };
  }, [router]);

  function clearAll() {
    setError(null);
    setInfo(null);
    setResultB64(null);
    setDisclaimer(null);
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
  }

  function handlePick(f: File | null) {
    setError(null);
    setInfo(null);
    setResultB64(null);
    setDisclaimer(null);

    if (!f) {
      clearAll();
      return;
    }

    if (!f.type.startsWith("image/")) {
      setError("Le fichier doit être une image.");
      return;
    }

    setFile(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(f));
    setInfo("Photo ajoutée. Tu peux lancer la simulation.");
  }

  async function handleSimulate() {
    setError(null);
    setInfo(null);

    if (!file) {
      setError("Ajoute une photo.");
      return;
    }

    const { data: sessionRes } = await supabase.auth.getSession();
    const session = sessionRes?.session;

    if (!session) {
      router.replace("/login");
      return;
    }

    setBusy(true);

    try {
      const form = new FormData();
      form.append("image", file);

      const res = await fetch("/api/vision/body-simulate", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: form,
      });

      const json = (await res.json().catch(() => ({}))) as ApiOk | ApiErr;

      if (!res.ok) {
        setError(json.error ?? "Erreur simulation.");
        return;
      }

      const ok = json as ApiOk;
      setResultB64(ok.image_b64);
      setDisclaimer(ok.disclaimer ?? null);
      if (typeof ok.credits_left === "number") setCredits(ok.credits_left);

      setInfo("Simulation générée (illustrative).");
    } finally {
      setBusy(false);
    }
  }

  const creditsLabel = isPremium ? "Premium · illimité" : `Crédits : ${credits ?? "—"} / 3`;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-wide text-zinc-500">JE RÉGIME · IA VISION</p>
            <div className="mt-2 flex items-center gap-3">
              <h1 className="text-2xl font-semibold">Vision Corps</h1>
              <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-800">
                {creditsLabel}
              </span>
            </div>
            <p className="mt-2 text-sm text-zinc-700">Simulation illustrative “après” (non médicale, non contractuelle).</p>
          </div>

          <Link href="/vision" className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50">
            ← IA Vision
          </Link>
        </div>

        {loading ? (
          <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
            Chargement…
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-zinc-200 p-5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">Photo (1)</p>
                  <p className="mt-1 text-sm text-zinc-700">Photo entière si possible, lumière naturelle, pas de filtre.</p>
                </div>

                {file ? (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
                  >
                    Supprimer
                  </button>
                ) : null}
              </div>

              <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-zinc-300 px-5 py-3 text-sm font-medium hover:bg-zinc-50">
                ➕ Ajouter une photo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handlePick(e.target.files?.[0] ?? null)}
                />
              </label>

              <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-zinc-300 px-5 py-3 text-sm font-medium hover:bg-zinc-50">
                📷 Prendre une photo
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handlePick(e.target.files?.[0] ?? null)}
                />
              </label>

              {preview ? (
                <div className="relative aspect-[3/4] max-w-sm overflow-hidden rounded-xl border border-zinc-200 bg-white">
                  <Image src={preview} alt="preview" fill className="object-cover" />
                </div>
              ) : null}

              <button
                type="button"
                onClick={handleSimulate}
                disabled={busy || !file}
                className="rounded-xl bg-black px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
              >
                {busy ? "Simulation…" : "Simuler mon corps"}
              </button>

              {info ? (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-800">{info}</div>
              ) : null}

              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
              ) : null}
            </div>

            {resultB64 ? (
              <div className="rounded-2xl border border-zinc-200 p-5 space-y-3">
                <p className="text-sm font-semibold text-zinc-900">Simulation</p>

                <div className="relative aspect-[3/4] max-w-sm overflow-hidden rounded-xl border border-zinc-200 bg-white">
                  <Image src={`data:image/png;base64,${resultB64}`} alt="simulation" fill className="object-cover" />
                </div>

                {disclaimer ? <p className="text-xs text-zinc-600">{disclaimer}</p> : null}

                <div className="mt-3 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setResultB64(null);
                      setDisclaimer(null);
                      setInfo("Tu peux changer de photo et relancer une simulation.");
                    }}
                    className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-medium hover:bg-zinc-50"
                  >
                    Nouvelle simulation
                  </button>

                  <Link href="/vision" className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-medium hover:bg-zinc-50">
                    Retour IA Vision
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </main>
  );
}
