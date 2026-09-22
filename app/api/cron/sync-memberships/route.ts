import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ALLOWED_OFFER_IDS, fetchPurchasesForOffers } from "@/lib/kajabi";


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
