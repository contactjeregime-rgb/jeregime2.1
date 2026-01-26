"use client";

import { useEffect, useMemo, useState } from "react";
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

type VisionApiOk = {
  ok: true;
  is_premium: boolean;
  credits_left: number | null;
  result: string;
};

type VisionApiErr = {
  error?: string;
  message?: string;
};

function clampFiles(input: File[], max: number) {
  return input.filter((f) => f.type.startsWith("image/")).slice(0, max);
}

export default function VisionPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [isPremium, setIsPremium] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const [dragOver, setDragOver] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function init() {
      setLoading(true);
      setError(null);

      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      const user = userRes?.user;

      if (!alive) return;

      if (userErr || !user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error: pErr } = await supabase
        .from("jr_user_profile")
        .select("onboarding_completed,is_premium")
        .eq("user_id", user.id)
        .maybeSingle<ProfileRow>();

      if (!alive) return;

      if (pErr || !profile?.onboarding_completed) {
        router.replace("/onboarding/step-1");
        return;
      }

      setIsPremium(Boolean(profile?.is_premium));

      const { data: cRow, error: cErr } = await supabase
        .from("jr_user_credits")
        .select("vision_credits")
        .eq("user_id", user.id)
        .maybeSingle<CreditsRow>();

      if (!alive) return;

      if (cErr) {
        setCredits(null);
      } else if (!cRow) {
        const { data: created } = await supabase
          .from("jr_user_credits")
          .insert({ user_id: user.id, vision_credits: 3 })
          .select("vision_credits")
          .maybeSingle<CreditsRow>();
        setCredits(typeof created?.vision_credits === "number" ? created.vision_credits : 3);
      } else {
        setCredits(typeof cRow.vision_credits === "number" ? cRow.vision_credits : null);
      }

      setLoading(false);
    }

    init();
    return () => {
      alive = false;
    };
  }, [router]);

  useEffect(() => {
    previewUrls.forEach((u) => URL.revokeObjectURL(u));
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviewUrls(urls);

    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  const creditsLeft = useMemo(
    () => (typeof credits === "number" ? Math.max(0, credits) : null),
    [credits]
  );

  const isLocked = useMemo(() => {
    if (isPremium) return false;
    if (creditsLeft === null) return false;
    return creditsLeft <= 0;
  }, [isPremium, creditsLeft]);

  const canAnalyze = useMemo(() => {
    if (files.length === 0 || busy || loading) return false;
    if (isLocked) return false;
    return true;
  }, [files, busy, loading, isLocked]);

  function resetMessages() {
    setError(null);
    setInfo(null);
    setResult(null);
  }

  function setPickedFiles(next: File[]) {
    const picked = clampFiles(next, 3);
    setFiles(picked);
    if (picked.length === 0) {
      setInfo("Ajoute 1 à 3 photos pour lancer l’analyse.");
    } else if (picked.length === 3) {
      setInfo("3 photos sélectionnées (maximum).");
    } else {
      setInfo(`${picked.length} photo${picked.length > 1 ? "s" : ""} sélectionnée${picked.length > 1 ? "s" : ""}.`);
    }
  }

  function handlePick(list: FileList | null) {
    resetMessages();
    if (!list || list.length === 0) {
      setFiles([]);
      return;
    }
    setPickedFiles(Array.from(list));
  }

  function removeAt(idx: number) {
    resetMessages();
    const next = files.filter((_, i) => i !== idx);
    setPickedFiles(next);
  }

  function clearAll() {
    resetMessages();
    setFiles([]);
  }

  function onDropFiles(dropped: File[]) {
    resetMessages();
    setPickedFiles(dropped);
  }

  async function handleAnalyze() {
    resetMessages();

    if (files.length === 0) {
      setError("Ajoute 1 à 3 photos.");
      return;
    }

    const { data: sessionRes } = await supabase.auth.getSession();
    const session = sessionRes?.session;

    if (!session) {
      setError("Non connecté.");
      router.replace("/login");
      return;
    }

    const before = creditsLeft;

    setBusy(true);

    try {
      const form = new FormData();
      for (const f of files) form.append("images", f);

      const res = await fetch("/api/vision/analyze", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: form,
      });

      const json = (await res.json().catch(() => ({}))) as VisionApiOk | VisionApiErr;

      if (!res.ok) {
        if ((json as VisionApiErr)?.error === "VISION_CREDITS_EXHAUSTED") {
          setCredits(0);
          setError("Crédits épuisés. Passe Premium pour débloquer l’IA Vision.");
        } else if ((json as VisionApiErr)?.error === "OPENAI_API_KEY missing") {
          setError("IA Vision pas encore activée côté serveur (clé OpenAI manquante).");
        } else {
          setError((json as VisionApiErr)?.error ?? "Erreur analyse.");
        }
        return;
      }

      const ok = json as VisionApiOk;
      setResult(ok.result ?? null);

      if (typeof ok.credits_left === "number") {
        setCredits(ok.credits_left);

        if (!isPremium && typeof before === "number") {
          const consumed = before - ok.credits_left;
          if (consumed > 0) setInfo(`Analyse effectuée : ${consumed} crédit consommé.`);
        }
      } else {
        if (isPremium) setInfo("Analyse effectuée (Premium : illimité).");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-wide text-zinc-500">JE RÉGIME · IA VISION</p>
            <div className="mt-2 flex items-center gap-3">
              <h1 className="text-2xl font-semibold">Analyse photo</h1>

              <span
                className={[
                  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
                  isPremium
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : isLocked
                    ? "border-red-200 bg-red-50 text-red-800"
                    : "border-zinc-200 bg-zinc-50 text-zinc-800",
                ].join(" ")}
              >
                {isPremium ? "Premium · illimité" : `Crédits : ${creditsLeft ?? "—"} / 3`}
              </span>
            </div>

            <p className="mt-2 text-sm text-zinc-700">
              {isPremium
                ? "Analyse illimitée. Résultat structuré, ton cabinet."
                : "3 essais gratuits. Ensuite Premium (pas de verrou dur tant que crédits disponibles)."}
            </p>
          </div>

          <Link
            href="/dashboard"
            className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
          >
            ← Dashboard
          </Link>
        </div>

        {loading ? (
          <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
            Chargement…
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {/* Card crédits / upgrade */}
            {!isPremium && creditsLeft !== null && creditsLeft <= 0 ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                <p className="text-sm font-semibold text-red-900">Crédits épuisés</p>
                <p className="mt-1 text-sm text-red-800">
                  L’IA Vision est verrouillée. Passe Premium pour débloquer l’analyse photo illimitée.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link href="/pricing" className="inline-flex rounded-xl bg-black px-5 py-3 text-sm font-medium text-white">
                    Passer Premium
                  </Link>
                  <Link
                    href="/dashboard"
                    className="inline-flex rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-medium text-red-900"
                  >
                    Revenir au dashboard
                  </Link>
                </div>
              </div>
            ) : null}

            {/* Dropzone */}
            <div className="rounded-2xl border border-zinc-200 p-5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">Photos (1 à 3)</p>
                  <p className="mt-1 text-sm text-zinc-700">Frigo · ticket de caisse · plat. Résultat unique et actionnable.</p>
                </div>

                {files.length ? (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
                  >
                    Tout supprimer
                  </button>
                ) : null}
              </div>

              <div
                className={[
                  "rounded-2xl border p-6 transition",
                  dragOver ? "border-black bg-zinc-50" : "border-zinc-200 bg-white",
                ].join(" ")}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOver(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOver(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOver(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOver(false);
                  const dropped = Array.from(e.dataTransfer.files ?? []);
                  onDropFiles(dropped);
                }}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">Glisse-dépose tes photos ici</p>
                    <p className="mt-1 text-sm text-zinc-700">ou utilise un bouton ci-dessous (max 3 images).</p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <label className="rounded-xl border border-zinc-300 px-4 py-3 text-sm font-medium hover:bg-zinc-50 cursor-pointer">
                      📷 Prendre une photo
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        multiple
                        className="hidden"
                        onChange={(e) => handlePick(e.target.files)}
                      />
                    </label>

                    <label className="rounded-xl border border-zinc-300 px-4 py-3 text-sm font-medium hover:bg-zinc-50 cursor-pointer">
                      🖼️ Importer
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => handlePick(e.target.files)}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Previews */}
              {files.length ? (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-zinc-900">Sélection ({files.length})</p>
                    <p className="text-xs text-zinc-600">Clique “X” pour retirer une image.</p>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {previewUrls.map((u, idx) => (
                      <div key={idx} className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white">
                        <div className="relative aspect-square">
                          <Image src={u} alt={`preview-${idx}`} fill className="object-cover" />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAt(idx)}
                          className="absolute right-2 top-2 rounded-full bg-black/80 px-2 py-1 text-xs font-medium text-white"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Messages */}
              {info ? (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-800">{info}</div>
              ) : null}

              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
              ) : null}

              {/* CTA */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={!canAnalyze}
                  className="rounded-xl bg-black px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
                >
                  {busy ? "Analyse…" : isLocked ? "Crédits épuisés" : "Analyser"}
                </button>

                {!isPremium && creditsLeft !== null && creditsLeft <= 1 ? (
                  <Link href="/pricing" className="text-sm font-medium text-zinc-900 underline underline-offset-4">
                    Débloquer illimité (Premium)
                  </Link>
                ) : null}
              </div>
            </div>

            {/* Result */}
            {result ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                <p className="text-xs font-medium tracking-wide text-zinc-500">RÉSULTAT</p>
                <div className="mt-3 whitespace-pre-wrap text-sm text-zinc-800">{result}</div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setResult(null);
                      setInfo("Tu peux relancer une analyse avec d’autres photos.");
                    }}
                    className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-medium hover:bg-zinc-50"
                  >
                    Nouvelle analyse
                  </button>

                  <Link
                    href="/dashboard"
                    className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-medium hover:bg-zinc-50"
                  >
                    Retour dashboard
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
