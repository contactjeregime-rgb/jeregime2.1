import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

function getBearerToken(req: Request): string | null {
  const h = req.headers.get("authorization");
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

function yyyyMmDd(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function daysSince(startISO: string, todayISO: string): number {
  const start = new Date(`${startISO}T00:00:00`);
  const today = new Date(`${todayISO}T00:00:00`);
  return Math.floor((today.getTime() - start.getTime()) / 86400000) + 1;
}

function short(s: unknown, max = 400): string | null {
  if (typeof s !== "string") return null;
  const t = s.trim();
  if (!t) return null;
  return t.length > max ? t.slice(0, max) : t;
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY missing" }, { status: 500 });
    }

    const accessToken = getBearerToken(req);
    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized (missing bearer token)" }, { status: 401 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !anonKey) {
      return NextResponse.json({ error: "Supabase env missing (URL/ANON)" }, { status: 500 });
    }
    if (!serviceKey) {
      return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY missing" }, { status: 500 });
    }

    const supabaseUser = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false },
    });

    const supabaseAdmin = createClient(url, serviceKey, { auth: { persistSession: false } });

    const { data: u, error: uErr } = await supabaseUser.auth.getUser();
    if (uErr || !u?.user?.id) {
      return NextResponse.json({ error: "Unauthorized (invalid token)" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as { day?: string } | null;
    const day = body?.day && /^\d{4}-\d{2}-\d{2}$/.test(body.day) ? body.day : null;
    if (!day) {
      return NextResponse.json({ error: "Missing/invalid day (YYYY-MM-DD)" }, { status: 400 });
    }

    // gating premium ou freemium 3 jours
    const { data: prof, error: pErr } = await supabaseUser
      .from("jr_user_profile")
      .select("is_premium,created_at,onboarding_completed_at")
      .eq("user_id", u.user.id)
      .maybeSingle();

    if (pErr) return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });

    const isPremium = Boolean(prof?.is_premium);
    const base = (prof?.onboarding_completed_at || prof?.created_at) as string | null;

    const todayISO = yyyyMmDd(new Date());
    let allow = isPremium;

    if (!allow && base) {
      const baseISO = yyyyMmDd(new Date(base));
      allow = daysSince(baseISO, todayISO) <= 3;
    }

    if (!allow) {
      return NextResponse.json({ error: "Premium required (freemium trial ended)" }, { status: 402 });
    }

    // checkin du jour
    const { data: ck, error: ckErr } = await supabaseUser
      .from("jr_user_checkins")
      .select("day,weight_kg,status,appetite,sleep_quality,activity,alcohol,smoking,notes_tags,coach_note")
      .eq("user_id", u.user.id)
      .eq("day", day)
      .maybeSingle();

    if (ckErr) return NextResponse.json({ error: "Failed to load checkin" }, { status: 500 });
    if (!ck) return NextResponse.json({ error: "No checkin for that day" }, { status: 404 });

    const { data: recent, error: rErr } = await supabaseUser
      .from("jr_user_checkins")
      .select("day,weight_kg,status,appetite,sleep_quality,activity,alcohol,smoking,notes_tags")
      .eq("user_id", u.user.id)
      .order("day", { ascending: false })
      .limit(14);

    if (rErr) return NextResponse.json({ error: "Failed to load recent checkins" }, { status: 500 });

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "Tu es un diététicien en cabinet (approche bien-être, pas médical). " +
            "Tu écris un avis court (1 paragraphe), clair, non culpabilisant. " +
            "Pas de diagnostic, pas de prescription. " +
            "Max 240 caractères. Termine par une action concrète pour demain.",
        },
        {
          role: "user",
          content:
            `DATE_CIBLE: ${day}\n` +
            `CHECKIN_DU_JOUR (JSON): ${JSON.stringify(ck)}\n` +
            `HISTORIQUE_RECENT (max 14 jours, JSON): ${JSON.stringify(recent || [])}\n` +
            `TÂCHE: écrire l'avis diététicien du jour.`,
        },
      ],
    });

    const note = completion.choices[0]?.message?.content?.trim();
    if (!note) return NextResponse.json({ error: "Empty AI response" }, { status: 500 });

    const { error: upErr } = await supabaseUser
      .from("jr_user_checkins")
      .update({ coach_note: note })
      .eq("user_id", u.user.id)
      .eq("day", day);

    if (upErr) return NextResponse.json({ error: "Failed to save coach_note" }, { status: 500 });

    const { error: logErr } = await supabaseAdmin.from("jr_ai_events").insert({
      user_id: u.user.id,
      event_type: "coach_note",
      input_summary: short(`day=${day} status=${ck.status} appetite=${ck.appetite ?? "-"} sleep=${ck.sleep_quality ?? "-"} activity=${ck.activity ?? "-"}`),
      output_summary: short(note, 400),
    });

    if (logErr) {
      console.log("JR_AI_EVENTS_LOG_ERROR:", logErr.message);
      return NextResponse.json({ ok: true, day, coach_note: note, log_warning: logErr.message }, { status: 200 });
    }

    console.log("JR_AI_EVENTS_LOG_OK:", { user_id: u.user.id, day });
    return NextResponse.json({ ok: true, day, coach_note: note }, { status: 200 });
  } catch (e: unknown) {
    const err = e as { name?: string; message?: string; status?: number; code?: string };
    console.log("CHECKIN_COACH_NOTE_CRASH:", err?.message ?? String(e));
    return NextResponse.json(
      {
        error: "CHECKIN_COACH_NOTE_CRASH",
        name: err?.name ?? "Error",
        message: err?.message ?? String(e),
        status: err?.status ?? null,
        code: err?.code ?? null,
      },
      { status: 500 }
    );
  }
}
