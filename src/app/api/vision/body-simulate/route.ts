import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI, { toFile } from "openai";
import { getUserEntitlements } from "@/lib/entitlements/getUserEntitlements";

export const runtime = "nodejs";

type JrCreditsRow = { vision_credits: number | null };

type ApiOk = {
  ok: true;
  is_premium: boolean;
  credits_left: number | null;
  image_b64: string; // png base64 (sans prefix)
  disclaimer: string;
};

type ApiErr = { error: string; message?: string };

function jsonError(error: string, status: number, message?: string) {
  const body: ApiErr = message ? { error, message } : { error };
  return NextResponse.json(body, { status });
}

function getBearerToken(req: Request): string | null {
  const h = req.headers.get("authorization");
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) return jsonError("OPENAI_API_KEY missing", 500);

    const accessToken = getBearerToken(req);
    if (!accessToken) return jsonError("Unauthorized (missing bearer token)", 401);

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return jsonError("Supabase env missing", 500);

    const supabase = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false },
    });

    const { data: u, error: uErr } = await supabase.auth.getUser();
    if (uErr || !u?.user?.id) return jsonError("Unauthorized (invalid token)", 401);

    const form = await req.formData();
    const image = form.get("image");
    if (!(image instanceof File)) return jsonError("Missing image", 400);

    // Central premium rules
    const ent = await getUserEntitlements(url, anonKey, accessToken);
    const isPremium = ent.isPremium;

    // Credits gate for freemium
    let creditsLeft: number | null = null;

    if (!ent.vision.unlimited) {
      const { data: cRow, error: cErr } = await supabase
        .from("jr_user_credits")
        .select("vision_credits")
        .eq("user_id", u.user.id)
        .maybeSingle<JrCreditsRow>();

      if (cErr) return jsonError("Failed to load credits", 500);

      if (!cRow) {
        const { data: created, error: insErr } = await supabase
          .from("jr_user_credits")
          .insert({ user_id: u.user.id, vision_credits: 3 })
          .select("vision_credits")
          .maybeSingle<JrCreditsRow>();

        if (insErr) return jsonError("Failed to init credits", 500);

        creditsLeft = typeof created?.vision_credits === "number" ? created.vision_credits : 3;
      } else {
        creditsLeft = typeof cRow.vision_credits === "number" ? cRow.vision_credits : 0;
      }

      if (!Number.isFinite(creditsLeft) || (creditsLeft as number) <= 0) {
        return jsonError("VISION_CREDITS_EXHAUSTED", 402);
      }
    }

    // Image edit (simulation illustrative)
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const buf = Buffer.from(await image.arrayBuffer());
    const input = await toFile(buf, "body.jpg", { type: image.type || "image/jpeg" });

    const disclaimer =
      "Simulation illustrative (non médicale, non contractuelle). Le rendu dépend de la photo, de la morphologie et des paramètres.";

    const prompt =
      "À partir de cette photo d'une personne, génère une version 'après' illustrative d'une transformation fitness/affinement réaliste. " +
      "Conserve l'identité et le visage (si visible), le style photo et l'éclairage, mais montre une silhouette plus tonique et plus affinée. " +
      "Aucune nudité explicite. Rendu naturel, crédible, type 'avant/après' sans texte ni watermark.";

    const rsp = await client.images.edit({
      model: "gpt-image-1",
      image: [input],
      prompt,
      size: "1024x1536",
      input_fidelity: "high",
    });

    const b64 = rsp.data?.[0]?.b64_json;
    if (!b64) return jsonError("Empty image response", 500);

    // Decrement credits only on success (freemium only)
    let newCredits: number | null = null;

    if (!ent.vision.unlimited) {
      const nextCredits = (creditsLeft as number) - 1;

      const { data: saved, error: upErr } = await supabase
        .from("jr_user_credits")
        .upsert({ user_id: u.user.id, vision_credits: nextCredits }, { onConflict: "user_id" })
        .select("vision_credits")
        .maybeSingle<JrCreditsRow>();

      if (upErr) return jsonError("Failed to decrement credits", 500);

      newCredits = typeof saved?.vision_credits === "number" ? saved.vision_credits : nextCredits;
    }

    const body: ApiOk = {
      ok: true,
      is_premium: isPremium,
      credits_left: newCredits,
      image_b64: b64,
      disclaimer,
    };

    return NextResponse.json(body, { status: 200 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonError("BODY_SIM_CRASH", 500, msg);
  }
}
