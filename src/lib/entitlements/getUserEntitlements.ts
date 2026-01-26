import { createClient } from "@supabase/supabase-js";

export type UserEntitlements = {
  isPremium: boolean;

  vision: {
    allowed: boolean;     // toujours true (freemium + crédits)
    unlimited: boolean;   // true si premium
  };

  report: {
    canRegenerate: boolean; // premium
  };

  opinion: {
    canGenerate: boolean;   // premium (ou freemium limité plus tard)
  };
};

export async function getUserEntitlements(
  supabaseUrl: string,
  supabaseAnonKey: string,
  accessToken: string
): Promise<UserEntitlements> {
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false },
  });

  const { data: userRes, error: uErr } = await supabase.auth.getUser();
  if (uErr || !userRes?.user) {
    throw new Error("UNAUTHORIZED");
  }

  const { data: profile, error: pErr } = await supabase
    .from("jr_user_profile")
    .select("is_premium")
    .eq("user_id", userRes.user.id)
    .maybeSingle<{ is_premium: boolean | null }>();

  if (pErr || !profile) {
    throw new Error("PROFILE_NOT_FOUND");
  }

  const isPremium = Boolean(profile.is_premium);

  return {
    isPremium,

    vision: {
      allowed: true,
      unlimited: isPremium,
    },

    report: {
      canRegenerate: isPremium,
    },

    opinion: {
      canGenerate: isPremium,
    },
  };
}
