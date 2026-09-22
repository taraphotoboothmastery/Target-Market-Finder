import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ALLOWED_OFFER_IDS, fetchPurchasesForOffers } from "@/lib/kajabi";

// TODO: fill in ALLOWED_OFFER_IDS in lib/kajabi.ts with the real Kajabi
// offer IDs for New Thrive + SCALE before relying on this in production.
// This route will run and clear out the memberships table (0 active
// members) until that list is populated — it will not silently grant
// access to anyone.

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const siteId = process.env.KAJABI_SITE_ID;
  if (!siteId) {
    return NextResponse.json({ error: "Missing KAJABI_SITE_ID" }, { status: 500 });
  }

  if (ALLOWED_OFFER_IDS.length === 0) {
    return NextResponse.json(
      {
        warning:
          "ALLOWED_OFFER_IDS is empty in lib/kajabi.ts — add the New Thrive + SCALE offer IDs before this sync can grant access to anyone.",
        synced: 0,
      },
      { status: 200 }
    );
  }

  try {
    const purchases = await fetchPurchasesForOffers(siteId, ALLOWED_OFFER_IDS);

    // Roll purchases up per email: a member is active if ANY of their
    // matching purchases is active.
    const byEmail = new Map<
      string,
      { contactId: string; offerIds: Set<string>; active: boolean }
    >();
    for (const p of purchases) {
      const entry = byEmail.get(p.email) ?? {
        contactId: p.contactId,
        offerIds: new Set<string>(),
        active: false,
      };
      entry.offerIds.add(p.offerId);
      entry.active = entry.active || p.active;
      byEmail.set(p.email, entry);
    }

    const rows = [...byEmail.entries()].map(([email, entry]) => ({
      email,
      kajabi_contact_id: entry.contactId,
      offer_ids: [...entry.offerIds],
      status: entry.active ? "active" : "inactive",
      synced_at: new Date().toISOString(),
    }));

    const supabaseAdmin = getSupabaseAdmin();
    if (rows.length > 0) {
      const { error } = await supabaseAdmin
        .from("memberships")
        .upsert(rows, { onConflict: "email" });
      if (error) throw error;
    }

    return NextResponse.json({ synced: rows.length });
  } catch (err) {
    console.error("sync-memberships failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
