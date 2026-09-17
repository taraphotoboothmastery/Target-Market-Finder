"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + "/dashboard" },
    });
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <main>
      <h1>Target Market Finder</h1>
      <p className="muted">
        Log in with your email — we'll send you a link, no password needed.
      </p>

      {sent ? (
        <div className="card">
          <strong>Check your email.</strong>
          <p className="muted">We sent a login link to {email}.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
          {error && <p style={{ color: "crimson" }}>{error}</p>}
          <button type="submit">Send login link</button>
        </form>
      )}
    </main>
  );
}
