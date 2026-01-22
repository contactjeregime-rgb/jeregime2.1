type AnyObj = Record<string, unknown>;

function asObj(v: unknown): AnyObj | null {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as AnyObj;
  return null;
}

function pickString(o: AnyObj, key: string): string | null {
  const v = o[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function pickNumber(o: AnyObj, key: string): number | null {
  const v = o[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/**
 * Construit un "system context" clinique court à partir du JSON du rapport utilisateur.
 * Objectif: cadrer l'IA (ton cabinet, prudence, pas de diagnostic/prescription),
 * et rappeler les points clés du profil sans dupliquer tout le JSON.
 */
export function buildMedicalContext(reportJson: unknown): string {
  const root = asObj(reportJson);

  // Valeurs par défaut (si le JSON varie)
  let firstName: string | null = null;
  let sex: string | null = null;
  let age: number | null = null;
  let bmi: number | null = null;
  let activity: string | null = null;
  let sleepQuality: string | null = null;
  let alcohol: string | null = null;
  let smoking: string | null = null;

  if (root) {
    const identity = asObj(root["identity"]);
    const metrics = asObj(root["metrics"]);
    const lifestyle = asObj(root["lifestyle"]);

    if (identity) {
      firstName = pickString(identity, "first_name");
      sex = pickString(identity, "sex");
      age = pickNumber(identity, "age");
    }

    if (metrics) {
      bmi = pickNumber(metrics, "bmi");
    }

    if (lifestyle) {
      activity = pickString(lifestyle, "activity_level");
      sleepQuality = pickString(lifestyle, "sleep_quality");
      alcohol = pickString(lifestyle, "alcohol_freq");
      smoking = pickString(lifestyle, "smoking_status");
    }
  }

  const lines: string[] = [];
  lines.push("CONTEXTE CLINIQUE (SYSTÈME) — JE REGIME");
  lines.push("- Rappel: approche cabinet de diététique, prévention métabolique, prudence clinique.");
  lines.push("- Interdits: diagnostic médical, prescription, promesses de résultat, ton culpabilisant.");
  lines.push("- Style: structuré, hiérarchisé, vocabulaire médical accessible (patient éclairé).");
  lines.push("- Toujours personnaliser la salutation avec le prénom si disponible.");

  const profileBits: string[] = [];
  if (firstName) profileBits.push(`prénom: ${firstName}`);
  if (age != null) profileBits.push(`âge: ${age}`);
  if (sex) profileBits.push(`sexe: ${sex}`);
  if (bmi != null) profileBits.push(`IMC: ${bmi}`);
  if (activity) profileBits.push(`activité: ${activity}`);
  if (sleepQuality) profileBits.push(`sommeil: ${sleepQuality}`);
  if (alcohol) profileBits.push(`alcool: ${alcohol}`);
  if (smoking) profileBits.push(`tabac: ${smoking}`);

  if (profileBits.length) {
    lines.push(`- Repères (si cohérents avec le JSON): ${profileBits.join(" | ")}.`);
  }

  lines.push(
    "- Sortie attendue: JSON strict conforme à la structure du rapport (en-tête, salutation, synthèse clinique, analyses, axes, objectifs, recommandations, conclusion, cadre JeRegime)."
  );

  return lines.join("\n");
}
