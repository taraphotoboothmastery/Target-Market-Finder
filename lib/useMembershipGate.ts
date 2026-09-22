"use client";

// Shared gate for every protected page: redirects to /login if there's
// no session, then calls /api/membership-status (which checks the
// memberships table server-side) and redirects to /not-a-member if the
// signed-in user isn't an active New Thrive or SCALE member.
//
// Usage:
//   const { status, session } = useMembershipGate();
//   if (status !== "allowed") return <main><p className="muted">Loading…</p></main>;

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

type GateStatus = "loading" | "allowed" | "denied";

export function useMembershipGate() {
  const router = useRouter();
  const [status, setStatus] = useState<GateStatus>("loading");
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const { data: sessionData } = await supabase.auth.getSession();
      const currentSession = sessionData.session;
      if (!currentSession) {
        router.replace("/login");
        return;
      }
      if (cancelled) return;
      setSession(currentSession);

      const res = await fetch("/api/membership-status", {
        headers: { Authorization: `Bearer ${currentSession.access_token}` },
      });
      const body = await res.json().catch(() => ({ allowed: false }));

      if (cancelled) return;
      if (res.ok && body.allowed) {
        setStatus("allowed");
      } else {
        setStatus("denied");
        router.replace("/not-a-member");
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return { status, session };
}
