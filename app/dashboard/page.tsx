"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type EventRow = {
  id: string;
  segment: "wedding" | "corporate";
  category: string;
  price: number | null;
  profit: number | null;
  lead_source: string | null;
  decision_maker: string | null;
  would_do_again: boolean | null;
  never_again: boolean | null;
};

type CategorySummary = {
  segment: string;
  category: string;
  count: number;
  avgRevenue: number;
  avgProfit: number;
};

const MIN_EVENTS_FOR_DRAFT = 3;

function summarize(events: EventRow[]): CategorySummary[] {
  const groups = new Map<string, EventRow[]>();
  for (const e of events) {
    const key = `${e.segment}::${e.category}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }
  const summaries: CategorySummary[] = [];
  for (const [key, rows] of groups) {
    const [segment, category] = key.split("::");
    const revenues = rows.map((r) => r.price ?? 0);
    const profits = rows.map((r) => r.profit ?? 0);
    summaries.push({
      segment,
      category,
      count: rows.length,
      avgRevenue: revenues.reduce((a, b) => a + b, 0) / rows.length,
      avgProfit: profits.reduce((a, b) => a + b, 0) / rows.length,
    });
  }
  return summaries.sort((a, b) => b.avgProfit - a.avgProfit);
}

export default function DashboardPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.replace("/login");
        return;
      }
      const { data } = await supabase
        .from("events")
        .select("*")
        .order("created_at", { ascending: false });
      setEvents((data as EventRow[]) ?? []);
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) {
    return (
      <main>
        <p className="muted">Loading…</p>
      </main>
    );
  }

  const weddingEvents = (events ?? []).filter((e) => e.segment === "wedding");
  const corporateEvents = (events ?? []).filter((e) => e.segment === "corporate");
  const summaries = summarize(events ?? []);

  return (
    <main>
      <nav style={{ marginLeft: "-1.5rem", marginRight: "-1.5rem", marginTop: "-2rem" }}>
        <strong>Target Market Finder</strong>
        <Link href="/events/new">Log an event</Link>
        <Link href="/profile/wedding">Wedding profile</Link>
        <Link href="/profile/corporate">Corporate profile</Link>
      </nav>

      <h1>Your events</h1>
      <p className="muted">
        {weddingEvents.length} wedding event{weddingEvents.length === 1 ? "" : "s"} · {" "}
        {corporateEvents.length} corporate event{corporateEvents.length === 1 ? "" : "s"} logged
      </p>

      {(events ?? []).length === 0 && (
        <div className="card">
          <p>You haven't logged any events yet.</p>
          <Link href="/events/new">
            <button>Log your first event</button>
          </Link>
        </div>
      )}

      {summaries.length > 0 && (
        <>
          <h2>By category, ranked by average profit</h2>
          {summaries.map((s) => (
            <div className="card" key={`${s.segment}-${s.category}`}>
              <div className="row">
                <div>
                  <strong>{s.category.replace(/_/g, " ")}</strong>
                  <div className="muted">
                    {s.segment} · {s.count} event{s.count === 1 ? "" : "s"}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div>Avg profit: ${s.avgProfit.toFixed(0)}</div>
                  <div className="muted">Avg revenue: ${s.avgRevenue.toFixed(0)}</div>
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {weddingEvents.length > 0 && weddingEvents.length < MIN_EVENTS_FOR_DRAFT && (
        <p className="muted">
          Log {MIN_EVENTS_FOR_DRAFT - weddingEvents.length} more wedding event
          {MIN_EVENTS_FOR_DRAFT - weddingEvents.length === 1 ? "" : "s"} to unlock a draft wedding
          target-market profile.
        </p>
      )}
      {corporateEvents.length > 0 && corporateEvents.length < MIN_EVENTS_FOR_DRAFT && (
        <p className="muted">
          Log {MIN_EVENTS_FOR_DRAFT - corporateEvents.length} more corporate event
          {MIN_EVENTS_FOR_DRAFT - corporateEvents.length === 1 ? "" : "s"} to unlock a draft
          corporate target-market profile.
        </p>
      )}
    </main>
  );
}
