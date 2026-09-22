"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useMembershipGate } from "@/lib/useMembershipGate";
import {
  WEDDING_TIERS,
  CORPORATE_CATEGORIES,
  WEDDING_DECISION_MAKERS,
  CORPORATE_DECISION_MAKERS,
  LEAD_SOURCES,
} from "@/lib/taxonomy";

export default function NewEventPage() {
  const router = useRouter();
  const { status } = useMembershipGate();
  const [segment, setSegment] = useState<"wedding" | "corporate">("wedding");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [profit, setProfit] = useState("");
  const [eventLength, setEventLength] = useState("");
  const [decisionMaker, setDecisionMaker] = useState("");
  const [leadSource, setLeadSource] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [wouldDoAgain, setWouldDoAgain] = useState(false);
  const [neverAgain, setNeverAgain] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoryOptions = segment === "wedding" ? WEDDING_TIERS : CORPORATE_CATEGORIES;
  const decisionMakerOptions =
    segment === "wedding" ? WEDDING_DECISION_MAKERS : CORPORATE_DECISION_MAKERS;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) {
      router.replace("/login");
      return;
    }

    const { error } = await supabase.from("events").insert({
      user_id: userId,
      segment,
      category,
      price: price ? Number(price) : null,
      profit: profit ? Number(profit) : null,
      event_length_hours: eventLength ? Number(eventLength) : null,
      decision_maker: decisionMaker || null,
      lead_source: leadSource || null,
      event_date: eventDate || null,
      would_do_again: wouldDoAgain,
      never_again: neverAgain,
      notes: notes || null,
    });

    setSaving(false);
    if (error) setError(error.message);
    else router.push("/dashboard");
  }

  if (status !== "allowed") {
    return (
      <main>
        <p className="muted">Loading…</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Log an event</h1>
      <p className="muted">
        One entry per past event. This is the raw data the rest of the app builds on.
      </p>

      <form onSubmit={handleSubmit}>
        <label>Type of event</label>
        <select
          value={segment}
          onChange={(e) => {
            setSegment(e.target.value as "wedding" | "corporate");
            setCategory("");
            setDecisionMaker("");
          }}
        >
          <option value="wedding">Wedding</option>
          <option value="corporate">Corporate</option>
        </select>

        <label>{segment === "wedding" ? "Budget tier" : "Category"}</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} required>
          <option value="" disabled>
            Select one
          </option>
          {categoryOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <label>Price paid ($)</label>
        <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />

        <label>Profit ($)</label>
        <input type="number" value={profit} onChange={(e) => setProfit(e.target.value)} />
        <p className="muted" style={{ marginTop: "0.25rem" }}>
          Use the number from your profit calculator.
        </p>

        <label>Event length (hours)</label>
        <input
          type="number"
          value={eventLength}
          onChange={(e) => setEventLength(e.target.value)}
        />

        <label>Who booked you?</label>
        <select value={decisionMaker} onChange={(e) => setDecisionMaker(e.target.value)}>
          <option value="">Select one</option>
          {decisionMakerOptions.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <label>How did they find you?</label>
        <select value={leadSource} onChange={(e) => setLeadSource(e.target.value)}>
          <option value="">Select one</option>
          {LEAD_SOURCES.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>

        <label>Event date</label>
        <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />

        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input
            type="checkbox"
            style={{ width: "auto" }}
            checked={wouldDoAgain}
            onChange={(e) => setWouldDoAgain(e.target.checked)}
          />
          I'd want more clients like this
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input
            type="checkbox"
            style={{ width: "auto" }}
            checked={neverAgain}
            onChange={(e) => setNeverAgain(e.target.checked)}
          />
          Never again
        </label>

        <label>Notes (optional)</label>
        <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />

        {error && <p style={{ color: "crimson" }}>{error}</p>}

        <button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save event"}
        </button>
      </form>
    </main>
  );
}
