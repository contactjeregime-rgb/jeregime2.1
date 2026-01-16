"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getOnboardingStatus, requireStep } from "@/lib/requireOnboarding";

const HOURS = Array.from({ length: 48 }).map((_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, "0");
  const m = i % 2 === 0 ? "00" : "30";
  return `${h}:${m}`;
});

export default function OnboardingStepFinal() {
  const router = useRouter();

  const [bedtime, setBedtime] = useState("");
  const [wakeup, setWakeup] = useState("");
  const [sleepQuality, setSleepQuality] = useState<string | null>(null);
  const [alcohol, setAlcohol] = useState<string | null>(null);
  const [smoking, setSmoking] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const status = await getOnboardingStatus();
      if (status.status === "no_user") return router.replace("/login");
      if (status.status === "done") return router.replace("/dashboard");
      if (!requireStep(status.step, 5, router)) return;
    })();
  }, [router]);

  const canContinue =
    bedtime && wakeup && sleepQuality && alcohol && smoking && !loading;

  async function handleFinish() {
    setLoading(true);

    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    if (!user) return router.replace("/login");

    const { error } = await supabase
      .from("jr_user_profile")
      .update({
        sleep_bedtime: bedtime,
        sleep_wakeup: wakeup,
        sleep_quality: sleepQuality,
        alcohol_freq: alcohol,
        smoking_status: smoking,
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
        onboarding_step: 6,
      })
      .eq("user_id", user.id);

    if (!error) router.replace("/onboarding/success");
    setLoading(false);
  }

  return (
    <div className="max-w-xl mx-auto py-10 space-y-8">
      <h1 className="text-2xl font-semibold text-center">Sommeil & habitudes</h1>

      <div>
        <p className="font-medium mb-2">Heure de coucher</p>
        <select
          className="w-full border rounded-lg p-3"
          value={bedtime}
          onChange={(e) => setBedtime(e.target.value)}
        >
          <option value="">Sélectionner</option>
          {HOURS.map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
      </div>

      <div>
        <p className="font-medium mb-2">Heure de réveil</p>
        <select
          className="w-full border rounded-lg p-3"
          value={wakeup}
          onChange={(e) => setWakeup(e.target.value)}
        >
          <option value="">Sélectionner</option>
          {HOURS.map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
      </div>

      <div>
        <p className="font-medium mb-2">Qualité du sommeil</p>
        <div className="grid grid-cols-3 gap-3">
          {["good","medium","bad"].map(v => (
            <button key={v} onClick={() => setSleepQuality(v)}
              className={`border rounded-lg p-3 ${sleepQuality===v?"border-black":"border-gray-300"}`}>
              {v==="good"?"Bonne":v==="medium"?"Moyenne":"Mauvaise"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="font-medium mb-2">Alcool</p>
        <div className="grid grid-cols-3 gap-3">
          {["never","1_2_week","3plus_week"].map(v => (
            <button key={v} onClick={() => setAlcohol(v)}
              className={`border rounded-lg p-3 ${alcohol===v?"border-black":"border-gray-300"}`}>
              {v==="never"?"Jamais":v==="1_2_week"?"1–2 / sem":"3+ / sem"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="font-medium mb-2">Tabac</p>
        <div className="grid grid-cols-3 gap-3">
          {["no","occasional","daily"].map(v => (
            <button key={v} onClick={() => setSmoking(v)}
              className={`border rounded-lg p-3 ${smoking===v?"border-black":"border-gray-300"}`}>
              {v==="no"?"Non":v==="occasional"?"Occasionnel":"Quotidien"}
            </button>
          ))}
        </div>
      </div>

      <button
        disabled={!canContinue}
        onClick={handleFinish}
        className="w-full bg-black text-white py-4 rounded-lg disabled:opacity-40"
      >
        Terminer
      </button>
    </div>
  );
}
