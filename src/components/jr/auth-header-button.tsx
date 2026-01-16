"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function AuthHeaderButton() {
  const [ready, setReady] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    let alive = true;

    async function init() {
      const { data } = await supabase.auth.getUser();
      if (!alive) return;
      setIsAuthed(!!data?.user);
      setReady(true);
    }

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthed(!!session?.user);
    });

    return () => {
      alive = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  if (!ready) return null;

  if (!isAuthed) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center justify-center rounded-2xl bg-primary px-4 py-2 text-primary-foreground font-medium hover:opacity-90"
      >
        Connexion
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/dashboard"
        className="inline-flex items-center justify-center rounded-2xl bg-primary px-4 py-2 text-primary-foreground font-medium hover:opacity-90"
      >
        Dashboard
      </Link>

      <button
        type="button"
        onClick={async () => {
          await supabase.auth.signOut();
          window.location.href = "/login";
        }}
        className="inline-flex items-center justify-center rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-zinc-900 font-medium hover:bg-zinc-50"
      >
        Déconnexion
      </button>
    </div>
  );
}
