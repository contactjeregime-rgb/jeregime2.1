import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { MEDICAL_REPORT_PROMPT } from "@/lib/ai/medicalReportPrompt";
import { buildMedicalContext } from "@/lib/ai/medicalContext";

type ReportRow = {
  id: string;
  user_id: string;
  report_version: number;
  report_json: unknown;
  created_at: string;
  updated_at: string;
};

function getBearerToken(req: Request): string | null {
  const h = req.headers.get("authorization");
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
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
    if (!url || !anonKey) {
      return NextResponse.json({ error: "Supabase env missing" }, { status: 500 });
    }

    const supabase = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false },
    });

    const { data: u, error: uErr } = await supabase.auth.getUser();
    if (uErr || !u?.user?.id) {
      return NextResponse.json({ error: "Unauthorized (invalid token)" }, { status: 401 });
    }

    const { data: report, error: rErr } = await supabase
      .from("jr_user_report")
      .select("id,user_id,report_version,report_json,created_at,updated_at")
      .eq("user_id", u.user.id)
      .maybeSingle<ReportRow>();

    if (rErr) return NextResponse.json({ error: "Failed to load report" }, { status: 500 });
    if (!report) return NextResponse.json({ error: "No saved report" }, { status: 404 });

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const medicalContext = buildMedicalContext(report.report_json);

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: MEDICAL_REPORT_PROMPT },
        { role: "system", content: medicalContext },
        {
          role: "user",
          content:
            `Date du jour (YYYY-MM-DD): ${today}\n` +
            `RAPPORT UTILISATEUR (JSON):\n${JSON.stringify(report.report_json)}`,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return NextResponse.json({ error: "Empty AI response" }, { status: 500 });

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json({ error: "AI returned non-JSON", raw: content.slice(0, 400) }, { status: 500 });
    }

    return NextResponse.json(
      {
        ok: true,
        coach_version: 1,
        reportId: report.id,
        reportVersion: report.report_version,
        coach_report: parsed,
      },
      { status: 200 }
    );
  } catch (e: unknown) {
    const err = e as { name?: string; message?: string; status?: number; code?: string };
    return NextResponse.json(
      {
        error: "AI_COACH_CRASH",
        name: err?.name ?? "Error",
        message: err?.message ?? String(e),
        status: err?.status ?? null,
        code: err?.code ?? null,
      },
      { status: 500 }
    );
  }
}
