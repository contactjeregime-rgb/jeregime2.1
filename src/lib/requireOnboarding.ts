import { supabase } from "@/lib/supabaseClient";

type Status =
  | { status: "no_user" }
  | { status: "done" }
  | { status: "in_progress"; step: number };

export async function getOnboardingStatus(): Promise<Status> {
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes?.user;
  if (!user) return { status: "no_user" };

  const { data, error } = await supabase
    .from("jr_user_profile")
    .select("onboarding_completed,onboarding_step")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) return { status: "in_progress", step: 1 };
  if (data.onboarding_completed) return { status: "done" };

  return { status: "in_progress", step: data.onboarding_step || 1 };
}

export function requireStep(
  current: number,
  needed: number,
  router: { replace: (p: string) => void }
) {
  if (current < needed) {
    router.replace(`/onboarding/step-${current}`);
    return false;
  }
  return true;
}
