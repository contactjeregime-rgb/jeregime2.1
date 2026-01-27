type AnyObj = Record<string, unknown>;

function asObj(v: unknown): AnyObj | null {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as AnyObj;
  return null;
}

function asArr(v: unknown): unknown[] | null {
  return Array.isArray(v) ? v : null;
}

function pickString(o: AnyObj, key: string): string | null {
  const v = o[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function pickNumber(o: AnyObj, key: string): number | null {
  const v = o[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function pickArrayStrings(o: AnyObj, key: string): string[] {
  const v = o[key];
  if (!Array.isArray(v)) return [];
  return v.filter((x) => typeof x === "string" && x.trim()).map((x) => String(x).trim());
}

export type JrProfile = {
  user_id: string;
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
  diet_tags: string[];
  allergies: string[];
  meal_style: string[];
  grocery_budget: string | null;
  cook_time: string | null;
  kitchen_tools: string[];
  cooking_level: string | null;
  sleep_bedtime: string | null;
  sleep_wakeup: string | null;
  sleep_quality: string | null;
  alcohol_freq: string | null;
  smoking_status: string | null;
  vaping_status: string | null;
  onboarding_completed: boolean;
  onboarding_completed_at: string | null;
  created_at: string | null;
};

export type JrCheckin = {
  day: string; // YYYY-MM-DD
  weight: number | null;
  mood: string | null;
  hunger: string | null;
  adherence: string | null;
};

export type FollowupInsights = {
  start_day: string | null;
  days_tracked: number;
  first_weight: number | null;
  last_weight: number | null;
  delta_kg: number | null;
  delta_7d_kg: number | null;
  hunger_trend: string | null;
  adherence_trend: string | null;
};

function safeRound(n: number, decimals = 1) {
  const p = Math.pow(10, decimals);
  return Math.round(n * p) / p;
}

function computeInsights(checkins: JrCheckin[]): FollowupInsights {
  const sorted = [...checkins].sort((a, b) => a.day.localeCompare(b.day));
  const days_tracked = sorted.length;

  const start_day = days_tracked ? sorted[0].day : null;

  const weights = sorted.filter((c) => typeof c.weight === "number" && Number.isFinite(c.weight as number)) as Array<
    JrCheckin & { weight: number }
  >;

  const first_weight = weights.length ? weights[0].weight : null;
  const last_weight = weights.length ? weights[weights.length - 1].weight : null;

  const delta_kg =
    first_weight != null && last_weight != null ? safeRound(last_weight - first_weight, 1) : null;

  // Delta 7 jours: compare dernier poids vs poids >= J-7 le plus proche
  let delta_7d_kg: number | null = null;
  if (weights.length >= 2) {
    const last = weights[weights.length - 1];
    const idx = Math.max(0, weights.length - 1);
    const lastDay = last.day;
    const lastDate = new Date(lastDay + "T00:00:00Z");
    const target = new Date(lastDate);
    target.setUTCDate(target.getUTCDate() - 7);

    // find closest weight on/after target date
    let candidate: (JrCheckin & { weight: number }) | null = null;
    for (const w of weights) {
      const d = new Date(w.day + "T00:00:00Z");
      if (d >= target && d <= lastDate) candidate = w;
    }
    if (candidate) delta_7d_kg = safeRound(last.weight - candidate.weight, 1);
  }

  // Tendances simples (mode des 7 derniers)
  const last7 = sorted.slice(Math.max(0, sorted.length - 7));
  const hungerVals = last7.map((c) => c.hunger).filter(Boolean) as string[];
  const adherenceVals = last7.map((c) => c.adherence).filter(Boolean) as string[];

  function mode(arr: string[]): string | null {
    if (!arr.length) return null;
    const m = new Map<string, number>();
    for (const x of arr) m.set(x, (m.get(x) || 0) + 1);
    let best: string | null = null;
    let bestN = -1;
    for (const [k, v] of m.entries()) {
      if (v > bestN) {
        best = k;
        bestN = v;
      }
    }
    return best;
  }

  return {
    start_day,
    days_tracked,
    first_weight,
    last_weight,
    delta_kg,
    delta_7d_kg,
    hunger_trend: mode(hungerVals),
    adherence_trend: mode(adherenceVals),
  };
}

/**
 * Contexte "Suivi / Mémoire" pour l'IA.
 * On injecte des faits stables + tendances: durée, poids, adhérence, faim.
 * IMPORTANT: rester dans le champ bien-être / diététique générale (pas médical).
 */
export function buildFollowupContext(profile: unknown, checkins: unknown): string {
  const p = asObj(profile) || {};
  const arr = asArr(checkins) || [];

  const prof: JrProfile = {
    user_id: (pickString(p, "user_id") || "") as string,
    first_name: pickString(p, "first_name"),
    age: (pickNumber(p, "age") ?? null) as number | null,
    sex: pickString(p, "sex"),
    height_cm: (pickNumber(p, "height_cm") ?? null) as number | null,
    weight_kg: (pickNumber(p, "weight_kg") ?? null) as number | null,
    target_weight_kg: (pickNumber(p, "target_weight_kg") ?? null) as number | null,
    goal_primary: pickString(p, "goal_primary"),
    activity_level: pickString(p, "activity_level"),
    work_type: pickString(p, "work_type"),
    eating_out_freq: pickString(p, "eating_out_freq"),
    diet_type: pickString(p, "diet_type"),
    diet_tags: pickArrayStrings(p, "diet_tags"),
    allergies: pickArrayStrings(p, "allergies"),
    meal_style: pickArrayStrings(p, "meal_style"),
    grocery_budget: pickString(p, "grocery_budget"),
    cook_time: pickString(p, "cook_time"),
    kitchen_tools: pickArrayStrings(p, "kitchen_tools"),
    cooking_level: pickString(p, "cooking_level"),
    sleep_bedtime: pickString(p, "sleep_bedtime"),
    sleep_wakeup: pickString(p, "sleep_wakeup"),
    sleep_quality: pickString(p, "sleep_quality"),
    alcohol_freq: pickString(p, "alcohol_freq"),
    smoking_status: pickString(p, "smoking_status"),
    vaping_status: pickString(p, "vaping_status"),
    onboarding_completed: Boolean(p["onboarding_completed"]),
    onboarding_completed_at: pickString(p, "onboarding_completed_at"),
    created_at: pickString(p, "created_at"),
  };

  const parsedCheckins: JrCheckin[] = arr
    .map((x) => asObj(x))
    .filter(Boolean)
    .map((o) => {
      const oo = o as AnyObj;
      const day = pickString(oo, "day") || "";
      const weight = pickNumber(oo, "weight");
      const mood = pickString(oo, "mood");
      const hunger = pickString(oo, "hunger");
      const adherence = pickString(oo, "adherence");
      return { day, weight, mood, hunger, adherence };
    })
    .filter((c) => c.day);

  const insights = computeInsights(parsedCheckins);

  const lines: string[] = [];
  lines.push("CONTEXTE SUIVI (SYSTÈME) — JE REGIME");
  lines.push("- Rôle: coach diététique type cabinet. Objectif: accompagnement durable + ajustements concrets.");
  lines.push("- Interdits: diagnostic/prescription, promesses de résultat, ton culpabilisant.");
  lines.push("- Toujours: rappeler la durée du suivi, les tendances observées, puis proposer 3 actions simples.");

  const bits: string[] = [];
  if (prof.first_name) bits.push(`prénom: ${prof.first_name}`);
  if (prof.age != null) bits.push(`âge: ${prof.age}`);
  if (prof.sex) bits.push(`sexe: ${prof.sex}`);
  if (prof.height_cm != null) bits.push(`taille: ${prof.height_cm} cm`);
  if (prof.weight_kg != null) bits.push(`poids départ onboarding: ${prof.weight_kg} kg`);
  if (prof.target_weight_kg != null) bits.push(`objectif: ${prof.target_weight_kg} kg`);
  if (prof.goal_primary) bits.push(`objectif principal: ${prof.goal_primary}`);
  if (prof.activity_level) bits.push(`activité: ${prof.activity_level}`);
  if (prof.sleep_quality) bits.push(`sommeil: ${prof.sleep_quality}`);
  if (prof.alcohol_freq) bits.push(`alcool: ${prof.alcohol_freq}`);
  if (prof.smoking_status) bits.push(`tabac: ${prof.smoking_status}`);
  if (prof.diet_type) bits.push(`régime: ${prof.diet_type}`);
  if (prof.diet_tags.length) bits.push(`tags: ${prof.diet_tags.join(", ")}`);
  if (prof.allergies.length) bits.push(`allergies: ${prof.allergies.join(", ")}`);

  if (bits.length) lines.push(`- Profil onboarding: ${bits.join(" | ")}.`);

  const followBits: string[] = [];
  if (insights.start_day) followBits.push(`début suivi: ${insights.start_day}`);
  followBits.push(`jours suivis: ${insights.days_tracked}`);
  if (insights.first_weight != null) followBits.push(`1er poids suivi: ${insights.first_weight} kg`);
  if (insights.last_weight != null) followBits.push(`dernier poids suivi: ${insights.last_weight} kg`);
  if (insights.delta_kg != null) followBits.push(`variation totale: ${insights.delta_kg} kg`);
  if (insights.delta_7d_kg != null) followBits.push(`variation 7 jours: ${insights.delta_7d_kg} kg`);
  if (insights.hunger_trend) followBits.push(`tendance faim (7j): ${insights.hunger_trend}`);
  if (insights.adherence_trend) followBits.push(`tendance adhérence (7j): ${insights.adherence_trend}`);

  lines.push(`- Mémoire suivi (faits): ${followBits.join(" | ")}.`);

  // Last 5 checkins for recent context
  const last5 = [...parsedCheckins].sort((a, b) => b.day.localeCompare(a.day)).slice(0, 5);
  if (last5.length) {
    lines.push("- Derniers check-ins (max 5):");
    for (const c of last5) {
      const parts: string[] = [];
      if (c.weight != null) parts.push(`poids ${c.weight}kg`);
      if (c.mood) parts.push(`humeur ${c.mood}`);
      if (c.hunger) parts.push(`faim ${c.hunger}`);
      if (c.adherence) parts.push(`adhérence ${c.adherence}`);
      lines.push(`  • ${c.day}: ${parts.join(", ") || "—"}`);
    }
  }

  lines.push("- Sortie attendue: réponse courte, structurée (constat → explication → 3 actions aujourd’hui → 1 focus semaine).");

  return lines.join("\n");
}
