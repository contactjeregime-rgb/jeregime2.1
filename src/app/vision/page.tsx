"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type ProfileRow = {
  onboarding_completed: boolean | null;
};

export default function VisionHubPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function init() {
      setLoading(true);

      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      const user = userRes?.user;

      if (!alive) return;

      if (userErr || !user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error: pErr } = await supabase
        .from("jr_user_profile")
        .select("onboarding_completed")
        .eq("user_id", user.id)
        .maybeSingle<ProfileRow>();

      if (!alive) return;

      if (pErr || !profile?.onboarding_completed) {
        router.replace("/onboarding/step-1");
        return;
      }

      setLoading(false);
    }

    init();
    return () => {
      alive = false;
    };
  }, [router]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-wide text-zinc-500">JE RÉGIME · IA VISION</p>
            <h1 className="mt-2 text-2xl font-semibold">IA Vision</h1>
            <p className="mt-2 text-sm text-zinc-700">
              Choisis un mode. Alimentation = analyse frigo/ticket/plat. Corps = simulation illustrative.
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
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Link
              href="/vision/alimentation"
              className="rounded-2xl border border-zinc-200 p-5 hover:bg-zinc-50"
            >
              <p className="text-sm font-semibold text-zinc-900">🥗 Vision Alimentation</p>
              <p className="mt-1 text-sm text-zinc-700">Analyse frigo · ticket · plat (conseils structurés).</p>
              <p className="mt-4 text-sm font-medium text-zinc-900">Ouvrir →</p>
            </Link>

            <Link
              href="/vision/corps"
              className="rounded-2xl border border-zinc-200 p-5 hover:bg-zinc-50"
            >
              <p className="text-sm font-semibold text-zinc-900">🧍 Vision Corps</p>
              <p className="mt-1 text-sm text-zinc-700">
                Simulation “après” illustrative (non médicale, non contractuelle).
              </p>
              <p className="mt-4 text-sm font-medium text-zinc-900">Ouvrir →</p>
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
