"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type CheckinRow = {
  id: string;
  user_id: string;
  day: string; // YYYY-MM-DD
  weight_kg: number | null;
  status: "ok" | "ecart" | "craquage" | "malade" | "voyage";
  appetite: "faible" | "normal" | "fort" | null;
  sleep_quality: "mauvais" | "moyen" | "bon" | null;
  activity: "none" | "light" | "moderate" | "intense" | null;
  alcohol: boolean | null;
  smoking: boolean | null;
  notes_tags: string[];
  coach_note: string | null;
  created_at: string | null;
};

type ProfileLite = {
  is_premium: boolean;
  created_at: string | null;
  onboarding_completed_at: string | null;
};

const STATUS_OPTIONS: Array<{ value: CheckinRow["status"]; label: string }> = [
  { value: "ok", label: "RAS (OK)" },
  { value: "ecart", label: "Écart" },
  { value: "craquage", label: "Craquage" },
  { value: "malade", label: "Malade" },
  { value: "voyage", label: "Voyage" },
];

const APPETITE_OPTIONS: Array<{ value: NonNullable<CheckinRow["appetite"]>; label: string }> = [
  { value: "faible", label: "Faible" },
  { value: "normal", label: "Normale" },
  { value: "fort", label: "Forte" },
];

const SLEEP_OPTIONS: Array<{ value: NonNullable<CheckinRow["sleep_quality"]>; label: string }> = [
  { value: "bon", label: "Bon" },
  { value: "moyen", label: "Moyen" },
  { value: "mauvais", label: "Mauvais" },
];

const ACTIVITY_OPTIONS: Array<{ value: NonNullable<CheckinRow["activity"]>; label: string }> = [
  { value: "none", label: "Aucune" },
  { value: "light", label: "Légère" },
  { value: "moderate", label: "Modérée" },
  { value: "intense", label: "Intense" },
];

function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function isoToDate(day: string): Date {
  return new Date(`${day}T00:00:00`);
}

function dateToISO(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function fmtDayFR(day: string) {
  const [y, m, d] = day.split("-");
  return `${d}/${m}/${y}`;
}

function parseWeight(input: string): number | null {
  const s = input.trim();
  if (!s) return null;
  const n = Number(s.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0 || n > 500) return null;
  return Math.round(n * 10) / 10;
}

function clampISO(day: string, minISO: string | null, maxISO: string): string {
  if (minISO && day < minISO) return minISO;
  if (day > maxISO) return maxISO;
  return day;
}

export default function SuiviPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileLite | null>(null);
  const [checkins, setCheckins] = useState<CheckinRow[]>([]);

  const maxDay = todayISO();

  // Form state
  const [day, setDay] = useState<string>(todayISO());
  const [weight, setWeight] = useState<string>("");
  const [status, setStatus] = useState<CheckinRow["status"]>("ok");
  const [appetite, setAppetite] = useState<CheckinRow["appetite"]>(null);
  const [sleepQuality, setSleepQuality] = useState<CheckinRow["sleep_quality"]>(null);
  const [activity, setActivity] = useState<CheckinRow["activity"]>(null);
  const [alcohol, setAlcohol] = useState<boolean | null>(null);
  const [smoking, setSmoking] = useState<boolean | null>(null);
  const [tagInput, setTagInput] = useState<string>("");

  const existingForDay = useMemo(() => {
    return checkins.find((c) => c.day === day) || null;
  }, [checkins, day]);

  const minDay = useMemo(() => {
    const base = profile?.onboarding_completed_at || profile?.created_at || null;
    if (!base) return null;
    const d = new Date(base);
    if (Number.isNaN(d.getTime())) return null;
    return dateToISO(d);
  }, [profile]);

  const trialInfo = useMemo(() => {
    const isPremium = Boolean(profile?.is_premium);
    if (isPremium) return { isPremium: true, allowDietitianNote: true, daysLeft: null };

    const base = profile?.onboarding_completed_at || profile?.created_at || null;
    if (!base) return { isPremium: false, allowDietitianNote: false, daysLeft: 0 };

    const start = new Date(base);
    if (Number.isNaN(start.getTime())) return { isPremium: false, allowDietitianNote: false, daysLeft: 0 };

    const now = isoToDate(todayISO());
    const startISO = dateToISO(start);
    const startD = isoToDate(startISO);

    const diffDays = Math.floor((now.getTime() - startD.getTime()) / 86400000) + 1;
    const allow = diffDays <= 3;
    const left = Math.max(0, 3 - diffDays);
    return { isPremium: false, allowDietitianNote: allow, daysLeft: left };
  }, [profile]);

  function tagsFromState(): string[] {
    return tagInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 8);
  }

  async function load() {
    setLoading(true);
    setError(null);

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) {
      router.push("/login");
      return;
    }

    const uid = authData.user.id;
    setUserId(uid);

    const { data: prof, error: pErr } = await supabase
      .from("jr_user_profile")
      .select("is_premium,created_at,onboarding_completed_at")
      .eq("user_id", uid)
      .maybeSingle();

    if (pErr) {
      setError(pErr.message);
      setProfile(null);
    } else {
      setProfile((prof || { is_premium: false, created_at: null, onboarding_completed_at: null }) as ProfileLite);
    }

    const { data, error: qErr } = await supabase
      .from("jr_user_checkins")
      .select("id,user_id,day,weight_kg,status,appetite,sleep_quality,activity,alcohol,smoking,notes_tags,coach_note,created_at")
      .eq("user_id", uid)
      .order("day", { ascending: false })
      .limit(180);

    if (qErr) {
      setError(qErr.message);
      setCheckins([]);
    } else {
      setCheckins((data || []) as CheckinRow[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const clamped = clampISO(day, minDay, maxDay);
    if (clamped !== day) setDay(clamped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minDay]);

  useEffect(() => {
    if (!existingForDay) return;
    setWeight(existingForDay.weight_kg != null ? String(existingForDay.weight_kg) : "");
    setStatus(existingForDay.status || "ok");
    setAppetite(existingForDay.appetite ?? null);
    setSleepQuality(existingForDay.sleep_quality ?? null);
    setActivity(existingForDay.activity ?? null);
    setAlcohol(existingForDay.alcohol ?? null);
    setSmoking(existingForDay.smoking ?? null);
    setTagInput(existingForDay.notes_tags?.length ? existingForDay.notes_tags.join(", ") : "");
  }, [existingForDay]);

  async function maybeGenerateDietitianNote(targetDay: string) {
    // Only attempt if UI says it should be available (server is the real authority anyway)
    if (!(trialInfo.isPremium || trialInfo.allowDietitianNote)) return;

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) return;

    const res = await fetch("/api/checkins/coach-note", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ day: targetDay }),
    });

    // 402 = freemium ended, 401 = not authorized; we keep UI clean and silent
    if (!res.ok && res.status !== 402 && res.status !== 401) {
      const j = await res.json().catch(() => null);
      throw new Error(j?.error || "Impossible de générer l’avis diététicien.");
    }
  }

  async function saveCheckin() {
    if (!userId) return;

    setSaving(true);
    setError(null);

    const w = parseWeight(weight);
    if (weight.trim() && w === null) {
      setSaving(false);
      setError("Poids invalide (ex: 91.2).");
      return;
    }

    const payload = {
      user_id: userId,
      day,
      weight_kg: w,
      status,
      appetite,
      sleep_quality: sleepQuality,
      activity,
      alcohol,
      smoking,
      notes_tags: tagsFromState(),
    };

    const { error: upErr } = await supabase
      .from("jr_user_checkins")
      .upsert(payload, { onConflict: "user_id,day" });

    if (upErr) {
      setSaving(false);
      setError(upErr.message);
      return;
    }

    // Generate note (if allowed) then reload
    try {
      await maybeGenerateDietitianNote(day);
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err?.message ?? "Erreur lors de la génération de l’avis diététicien.");
    }

    await load();
    setSaving(false);
  }

  function goPrevious() {
    const d = isoToDate(day);
    d.setDate(d.getDate() - 1);
    setDay(clampISO(dateToISO(d), minDay, maxDay));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToday() {
    setDay(todayISO());
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const stats = useMemo(() => {
    const sorted = [...checkins].sort((a, b) => a.day.localeCompare(b.day));
    const weights = sorted.filter((c) => typeof c.weight_kg === "number" && Number.isFinite(c.weight_kg as number)) as Array<
      CheckinRow & { weight_kg: number }
    >;

    const first = weights.length ? weights[0].weight_kg : null;
    const last = weights.length ? weights[weights.length - 1].weight_kg : null;
    const delta = first != null && last != null ? Math.round((last - first) * 10) / 10 : null;

    return { days: sorted.length, first, last, delta };
  }, [checkins]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">Carnet de suivi</h1>
          <p className="text-base text-muted-foreground mt-2">
            Tu peux remplir n’importe quel jour depuis ton inscription.
          </p>
        </div>
        <button
          onClick={() => router.push("/dashboard")}
          className="inline-flex items-center rounded-md border px-4 py-2 text-sm hover:bg-muted"
        >
          Retour dashboard
        </button>
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-10 text-sm text-muted-foreground">Chargement…</div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border bg-background p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">Jours suivis</p>
              <p className="mt-1 text-3xl font-semibold">{stats.days}</p>
            </div>
            <div className="rounded-2xl border bg-background p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">Évolution (si poids renseigné)</p>
              <p className="mt-1 text-3xl font-semibold">
                {stats.delta == null ? "—" : `${stats.delta > 0 ? "+" : ""}${stats.delta} kg`}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Début: {stats.first == null ? "—" : `${stats.first} kg`} • Actuel: {stats.last == null ? "—" : `${stats.last} kg`}
              </p>
            </div>
            <div className="rounded-2xl border bg-background p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">Accès “Avis diététicien”</p>
              <p className="mt-1 text-lg font-semibold">
                {trialInfo.isPremium
                  ? "Premium actif"
                  : trialInfo.allowDietitianNote
                    ? "Essai Freemium (3 jours)"
                    : "Verrouillé (Premium)"}
              </p>
              {!trialInfo.isPremium && trialInfo.allowDietitianNote && (
                <p className="mt-1 text-xs text-muted-foreground">Il reste {trialInfo.daysLeft} jour(s) d’essai.</p>
              )}
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* FORM */}
            <div className="rounded-2xl border bg-background p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">Mon suivi</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Utilise “Précédent” pour remonter autant que tu veux.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={goPrevious}
                    className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
                  >
                    Précédent
                  </button>
                  <button
                    type="button"
                    onClick={goToday}
                    className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
                  >
                    Aujourd’hui
                  </button>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="text-sm font-medium">Date</label>
                  <input
                    type="date"
                    value={day}
                    min={minDay ?? undefined}
                    max={maxDay}
                    onChange={(e) => setDay(clampISO(e.target.value, minDay, maxDay))}
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {existingForDay ? `Déjà rempli pour le ${fmtDayFR(day)} — tu peux modifier puis enregistrer.` : `Check-in pour le ${fmtDayFR(day)}.`}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium">Poids (kg) — optionnel</label>
                  <input
                    inputMode="decimal"
                    placeholder="ex: 91.2"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Statut</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as CheckinRow["status"])}
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium">Faim</label>
                    <select
                      value={appetite ?? ""}
                      onChange={(e) => setAppetite((e.target.value || null) as CheckinRow["appetite"])}
                      className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    >
                      <option value="">—</option>
                      {APPETITE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Sommeil</label>
                    <select
                      value={sleepQuality ?? ""}
                      onChange={(e) => setSleepQuality((e.target.value || null) as CheckinRow["sleep_quality"])}
                      className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    >
                      <option value="">—</option>
                      {SLEEP_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Activité</label>
                  <select
                    value={activity ?? ""}
                    onChange={(e) => setActivity((e.target.value || null) as CheckinRow["activity"])}
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  >
                    <option value="">—</option>
                    {ACTIVITY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-xl border p-4">
                    <p className="text-sm font-medium">Alcool aujourd’hui ?</p>
                    <div className="mt-2 flex gap-2">
                      <button type="button" onClick={() => setAlcohol(true)} className={`rounded-md border px-3 py-2 text-sm ${alcohol === true ? "bg-muted" : "hover:bg-muted"}`}>
                        Oui
                      </button>
                      <button type="button" onClick={() => setAlcohol(false)} className={`rounded-md border px-3 py-2 text-sm ${alcohol === false ? "bg-muted" : "hover:bg-muted"}`}>
                        Non
                      </button>
                      <button type="button" onClick={() => setAlcohol(null)} className={`rounded-md border px-3 py-2 text-sm ${alcohol === null ? "bg-muted" : "hover:bg-muted"}`}>
                        —
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border p-4">
                    <p className="text-sm font-medium">Tabac aujourd’hui ?</p>
                    <div className="mt-2 flex gap-2">
                      <button type="button" onClick={() => setSmoking(true)} className={`rounded-md border px-3 py-2 text-sm ${smoking === true ? "bg-muted" : "hover:bg-muted"}`}>
                        Oui
                      </button>
                      <button type="button" onClick={() => setSmoking(false)} className={`rounded-md border px-3 py-2 text-sm ${smoking === false ? "bg-muted" : "hover:bg-muted"}`}>
                        Non
                      </button>
                      <button type="button" onClick={() => setSmoking(null)} className={`rounded-md border px-3 py-2 text-sm ${smoking === null ? "bg-muted" : "hover:bg-muted"}`}>
                        —
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Tags (optionnel)</label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Mots-clés séparés par des virgules (max 8). Exemple: grignotage, soir, stress.
                  </p>
                  <input
                    placeholder="ex: grignotage, stress"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    className="mt-2 w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>

                <button
                  onClick={saveCheckin}
                  disabled={saving}
                  className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-black px-4 py-3 text-base font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? "Enregistrement…" : "Enregistrer mon suivi"}
                </button>
              </div>
            </div>

            {/* TIMELINE */}
            <div className="rounded-2xl border bg-background p-6 shadow-sm">
              <h2 className="text-xl font-semibold">Historique</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Ton carnet. Le “Avis diététicien” est affiché selon ton accès.
              </p>

              <div className="mt-5 space-y-3">
                {checkins.length === 0 ? (
                  <div className="rounded-xl border px-4 py-3 text-sm text-muted-foreground">
                    Aucun check-in pour l’instant. Commence aujourd’hui.
                  </div>
                ) : (
                  checkins.map((c) => (
                    <div key={c.id} className="rounded-2xl border p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">{fmtDayFR(c.day)}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Statut: {c.status}
                            {c.weight_kg != null ? ` • Poids: ${c.weight_kg} kg` : ""}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setDay(c.day);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="rounded-md border px-3 py-2 text-xs hover:bg-muted"
                        >
                          Modifier
                        </button>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-2 text-xs text-muted-foreground md:grid-cols-2">
                        <div>Faim: {c.appetite ?? "—"}</div>
                        <div>Sommeil: {c.sleep_quality ?? "—"}</div>
                        <div>Activité: {c.activity ?? "—"}</div>
                        <div>Alcool: {c.alcohol == null ? "—" : c.alcohol ? "Oui" : "Non"}</div>
                        <div>Tabac: {c.smoking == null ? "—" : c.smoking ? "Oui" : "Non"}</div>
                        <div>Tags: {c.notes_tags?.length ? c.notes_tags.join(", ") : "—"}</div>
                      </div>

                      <div className="mt-4 rounded-xl bg-muted px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-semibold">Avis diététicien</p>
                          {!trialInfo.isPremium && (
                            <p className="text-[11px] text-muted-foreground">
                              {trialInfo.allowDietitianNote ? "Freemium (3 jours)" : "Premium requis"}
                            </p>
                          )}
                        </div>

                        <p className="mt-2 text-sm text-muted-foreground">
                          {trialInfo.isPremium || trialInfo.allowDietitianNote
                            ? (c.coach_note ? c.coach_note : "— (il apparaîtra automatiquement après enregistrement)")
                            : "— Verrouillé. Active Premium pour obtenir l’avis diététicien sur ton suivi."}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
