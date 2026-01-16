"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    let alive = true;

    async function run() {
      try {
        await supabase.auth.exchangeCodeForSession(window.location.href);
        const { data: s } = await supabase.auth.getSession();
        if (!alive) return;

        const user = s?.session?.user;
        if (!user) return router.replace("/login");

        const done = user.user_metadata?.onboarding_done === true;
        router.replace(done ? "/dashboard" : "/onboarding");
      } catch {
        router.replace("/login");
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16 bg-zinc-50">
      <div className="text-zinc-700">Connexion…</div>
    </main>
  );
}
