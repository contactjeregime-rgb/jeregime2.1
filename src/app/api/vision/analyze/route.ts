import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { getUserEntitlements } from "@/lib/entitlements/getUserEntitlements";
import { VISION_FOOD_PROMPT_V1, VISION_FOOD_USER_TASK_V1 } from "@/lib/ai/visionPrompts";

export const runtime = "nodejs";

type JrCreditsRow = {
  vision_credits: number | null;
};

type VisionApiOk = {
  ok: true;
  is_premium: boolean;
  credits_left: number | null;
  result: string;
};

type VisionApiErr = {
  error: string;
  message?: string;
};

function jsonError(error: string, status: number, message?: string) {
  const body: VisionApiErr = message ? { error, message } : { error };
  return NextResponse.json(body, { status });
}

function getBearerToken(req: Request): string | null {
  const h = req.headers.get("authorization");
  if (!h) return null;
  const m = h.match(/^Bearer\\s+(.+)$/i);
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

    // Auth user (RLS) via bearer token
    const supabase = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false },
    });

    const { data: u, error: uErr } = await supabase.auth.getUser();
    if (uErr || !u?.user?.id) return jsonError("Unauthorized (invalid token)", 401);

    // Parse images
    const form = await req.formData();
    const files = (form.getAll("images") ?? []).filter((f): f is File => f instanceof File);
    const single = form.get("image");
    const allFiles: File[] = files.length ? files : single instanceof File ? [single] : [];

    if (allFiles.length === 0) return jsonError("Missing image", 400);
    const picked = allFiles.slice(0, 3);

    // Central premium rules
    const ent = await getUserEntitlements(url, anonKey, accessToken);
    const isPremium = ent.isPremium;

    // Credits gate (freemium)
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

    // OpenAI Vision (text output)
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const images: { mime: string; base64: string }[] = [];
    for (const f of picked) {
      const buf = Buffer.from(await f.arrayBuffer());
      images.push({ mime: f.type || "image/jpeg", base64: buf.toString("base64") });
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: VISION_FOOD_PROMPT_V1 },
        {
          role: "user",
          content: [
            { type: "text", text: VISION_FOOD_USER_TASK_V1 },
            ...images.map((img) => ({
              type: "image_url",
              image_url: { url: `data:${img.mime};base64,${img.base64}` },
            })),
          ],
        },
      ],
    });

    const text = completion.choices[0]?.message?.content?.trim();
    if (!text) return jsonError("Empty AI response", 500);

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

    const body: VisionApiOk = {
      ok: true,
      is_premium: isPremium,
      credits_left: newCredits,
      result: text,
    };

    return NextResponse.json(body, { status: 200 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonError("VISION_CRASH", 500, msg);
  }
}
