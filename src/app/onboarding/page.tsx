"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function OnboardingEntryPage() {
  const router = useRouter();

  useEffect(() => {
    let alive = true;

    (async () => {
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (!alive) return;

      const user = userRes?.user;
      if (userErr || !user) {
        router.replace("/signup");
        return;
      }

      const { data: profile, error } = await supabase
        .from("jr_user_profile")
        .select("onboarding_completed")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!alive) return;

      // Si erreur DB ou pas de profil, on reprend l'onboarding
      if (error || !profile) {
        router.replace("/onboarding/step-1");
        return;
      }

      if (profile.onboarding_completed) {
        router.replace("/dashboard");
        return;
      }

      router.replace("/onboarding/step-1");
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16 bg-white">
      <div className="text-zinc-700">Redirection…</div>
    </main>
  );
}
