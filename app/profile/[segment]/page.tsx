"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useMembershipGate } from "@/lib/useMembershipGate";

type EventRow = {
  segment: "wedding" | "corporate";
  category: string;
  price: number | null;
  profit: number | null;
  lead_source: string | null;
  decision_maker: string | null;
};

function topBy<T extends string>(items: (T | null)[], take: number): T[] {
  const counts = new Map<T, number>();
  for (const item of items) {
    if (!item) continue;
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, take)
    .map(([key]) => key);
}

function buildDraft(segment: "wedding" | "corporate", events: EventRow[]) {
  const rows = events.filter((e) => e.segment === segment);

  // Rank categories by average profit, same logic as the dashboard.
  const byCategory = new Map<string, EventRow[]>();
  for (const r of rows) {
    if (!byCategory.has(r.category)) byCategory.set(r.category, []);
    byCategory.get(r.category)!.push(r);
  }
  const rankedCategories = [...byCategory.entries()]
    .map(([category, catRows]) => ({
      category,
      avgProfit:
        catRows.reduce((sum, r) => sum + (r.profit ?? 0), 0) / catRows.length,
    }))
    .sort((a, b) => b.avgProfit - a.avgProfit)
    .map((c) => c.category.replace(/_/g, " "));

  // Weddings: transcript treats this as a single focus. Corporate: top 2-3.
  const topCategories =
    segment === "wedding" ? rankedCategories.slice(0, 1) : rankedCategories.slice(0, 3);

  const topDecisionMakers = topBy(rows.map((r) => r.decision_maker), 1);
  const topLeadSources = topBy(rows.map((r) => r.lead_source), 3);

  return {
    top_categories: topCategories.join(", "),
    client_type: topDecisionMakers.join(", "),
    lead_sources: topLeadSources.join(", "),
    vendor_search_habit: "",
  };
}

export default function ProfilePage({ params }: { params: { segment: string } }) {
  const router = useRouter();
  const { status } = useMembershipGate();
  const segment = params.segment === "corporate" ? "corporate" : "wedding";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [eventCount, setEventCount] = useState(0);
  const [topCategories, setTopCategories] = useState("");
  const [clientType, setClientType] = useState("");
  const [leadSources, setLeadSources] = useState("");
  const [vendorSearchHabit, setVendorSearchHabit] = useState("");
  const [isFinalized, setIsFinalized] = useState(false);

  useEffect(() => {
    if (status !== "allowed") return;
    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) {
        router.replace("/login");
        return;
      }

      const { data: existing } = await supabase
        .from("target_market_profiles")
        .select("*")
        .eq("segment", segment)
        .maybeSingle();

      const { data: events } = await supabase
        .from("events")
        .select("segment, category, price, profit, lead_source, decision_maker");

      const segmentEvents = ((events as EventRow[]) ?? []).filter(
        (e) => e.segment === segment
      );
      setEventCount(segmentEvents.length);

      if (existing) {
        setTopCategories(existing.top_categories ?? "");
        setClientType(existing.client_type ?? "");
        setLeadSources(existing.lead_sources ?? "");
        setVendorSearchHabit(existing.vendor_search_habit ?? "");
        setIsFinalized(existing.is_finalized ?? false);
      } else {
        const draft = buildDraft(segment, (events as EventRow[]) ?? []);
        setTopCategories(draft.top_categories);
        setClientType(draft.client_type);
        setLeadSources(draft.lead_sources);
        setVendorSearchHabit(draft.vendor_search_habit);
      }
      setLoading(false);
    }
    load();
  }, [router, segment, status]);

  async function handleSave(finalize: boolean) {
    setSaving(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) return;

    await supabase.from("target_market_profiles").upsert(
      {
        user_id: userId,
        segment,
        top_categories: topCategories,
        client_type: clientType,
        lead_sources: leadSources,
        vendor_search_habit: vendorSearchHabit,
        is_finalized: finalize,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,segment" }
    );
    setIsFinalized(finalize);
    setSaving(false);
  }

  if (status !== "allowed" || loading) {
    return (
      <main>
        <p className="muted">Loading…</p>
      </main>
    );
  }

  const label = segment === "wedding" ? "Wedding" : "Corporate";

  return (
    <main>
      <h1>{label} target market</h1>
      <p className="muted">
        Based on {eventCount} logged {segment} event{eventCount === 1 ? "" : "s"}. This started
        as a draft pulled from your data — edit anything that doesn't feel right. Revenue isn't
        the whole story; joy and gut feel count too.
      </p>

      {eventCount === 0 && (
        <div className="card">
          <p>No {segment} events logged yet, so there's nothing to draft from.</p>
        </div>
      )}

      <div className="card">
        <label>The {segment === "wedding" ? "weddings" : "events"} that brought in the most revenue for my business were</label>
        <textarea
          rows={2}
          value={topCategories}
          onChange={(e) => setTopCategories(e.target.value)}
        />

        <label>The clients who booked me were mostly</label>
        <textarea rows={2} value={clientType} onChange={(e) => setClientType(e.target.value)} />

        <label>The way they found me was</label>
        <textarea
          rows={2}
          value={leadSources}
          onChange={(e) => setLeadSources(e.target.value)}
        />

        <label>When looking for vendors, my ideal client goes to</label>
        <textarea
          rows={2}
          value={vendorSearchHabit}
          onChange={(e) => setVendorSearchHabit(e.target.value)}
          placeholder="e.g. their planner, Instagram, Pinterest, a venue referral…"
        />

        <div className="row" style={{ marginTop: "1.5rem" }}>
          <button className="secondary" onClick={() => handleSave(false)} disabled={saving}>
            Save draft
          </button>
          <button onClick={() => handleSave(true)} disabled={saving}>
            {isFinalized ? "Update final profile" : "Finalize"}
          </button>
        </div>
      </div>
    </main>
  );
}
