import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// Verifies the caller's Supabase access token server-side (never trusts
// a client-supplied email), then checks the memberships table — which
// has no RLS policies for anon/authenticated, so this is the only way
// a logged-in user's own membership status reaches their browser.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer /, "");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 });
  }

  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: userData, error: userError } = await anonClient.auth.getUser(token);
  if (userError || !userData.user?.email) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const email = userData.user.email.toLowerCase();
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("memberships")
    .select("status")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    console.error("membership-status lookup failed", error);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }

  return NextResponse.json({ allowed: data?.status === "active" });
}
