"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type ApiState =
  | { status: "idle" }
  | { status: "no-session"; msg: string }
  | { status: "loading" }
  | { status: "ok"; payload: unknown }
  | { status: "error"; msg: string; details?: unknown };

export default function DevTokenPage() {
  const [tokenInfo, setTokenInfo] = useState<string>("Chargement session...");
  const [api, setApi] = useState<ApiState>({ status: "idle" });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const tok = data.session?.access_token;

      if (!tok) {
        setTokenInfo("Pas de session: connecte-toi d’abord, puis recharge cette page.");
        setApi({ status: "no-session", msg: "No session" });
        return;
      }

      setTokenInfo(`TOKEN_PREFIX: ${tok.slice(0, 24)}\nTOKEN_LEN: ${tok.length}`);

      setApi({ status: "loading" });
      try {
        const res = await fetch("/api/ai-coach", {
          method: "POST",
          headers: { Authorization: `Bearer ${tok}` },
        });

        const ct = res.headers.get("content-type") || "";
        const body = ct.includes("application/json") ? await res.json() : await res.text();

        if (!res.ok) {
          setApi({ status: "error", msg: `API error ${res.status}`, details: body });
          return;
        }

        setApi({ status: "ok", payload: body });
      } catch (e) {
        setApi({ status: "error", msg: "Fetch failed", details: String(e) });
      }
    })();
  }, []);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 space-y-4">
      <pre className="whitespace-pre-wrap rounded-2xl border border-gray-200 bg-white p-6 text-sm">
        {tokenInfo}
      </pre>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm">
        {api.status === "idle" && <p>Idle</p>}
        {api.status === "loading" && <p>Appel /api/ai-coach…</p>}
        {api.status === "no-session" && <p>{api.msg}</p>}
        {api.status === "ok" && (
          <>
            <p className="font-semibold">API OK</p>
            <pre className="mt-3 whitespace-pre-wrap">{JSON.stringify(api.payload, null, 2)}</pre>
          </>
        )}
        {api.status === "error" && (
          <>
            <p className="font-semibold">API ERROR</p>
            <p className="mt-2">{api.msg}</p>
            <pre className="mt-3 whitespace-pre-wrap">{JSON.stringify(api.details, null, 2)}</pre>
          </>
        )}
      </div>
    </main>
  );
}
