"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  children: React.ReactNode;
  className?: string;
};

export default function SmartBilanLink({ children, className }: Props) {
  const [href, setHref] = useState("/signup");

  useEffect(() => {
    let alive = true;

    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!alive) return;

      setHref(userRes?.user ? "/onboarding" : "/signup");
    })();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
