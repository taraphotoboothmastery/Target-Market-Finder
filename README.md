# Target Market Finder

A tool for PBMH students to log their past events and get a data-backed
picture of who their ideal wedding and corporate clients actually are —
based on the Bankable Bookings Bootcamp target-market exercise.

## What it does (v1)

1. Student logs in.
2. Student logs past events one at a time (type, category, price, profit,
   who booked them, how they found you, and a "would do again" / "never
   again" flag).
3. Dashboard shows those events grouped by category, with count and
   average revenue/profit per category, sorted — so the highest-value
   category is obvious without a spreadsheet.
4. Once enough events are logged, the app drafts a "Mad Lib" style
   target-market profile (one for weddings, one for corporate) using the
   top category, top lead sources, and most common decision-maker.
5. Student edits that draft by hand (revenue isn't the whole story — joy
   and gut feel matter too, per the original exercise) and saves a final
   version they can come back to any time.

## Stack

- **Next.js** — the app itself (React, App Router)
- **Supabase** — database + login (email magic link)
- **Vercel** — hosting/deploys
- **GitHub** — where the code lives; Vercel deploys from this repo

## Access

Gated to active **New Thrive** and **SCALE** members only, following the same
pattern as the Pricing Blueprint App: a scheduled job syncs Kajabi purchases
into a `memberships` table, and every protected page checks that table
before rendering. See "Finish the membership sync" below — this part is not
fully wired up yet.

## One-time setup

### 1. Create a Supabase project
- Go to supabase.com → New Project.
- Once it's created, open **SQL Editor** and paste in the contents of
  `sql/schema.sql` (in this repo) and run it. This creates the two
  tables the app needs.
- Go to **Project Settings → API**. You'll need two values from here in
  step 3: the **Project URL** and the **anon public key**.

### 2. Push this code to GitHub
- Create a new empty repo on GitHub (no README/license — this folder
  already has one).
- From this folder:
  ```
  git init
  git add .
  git commit -m "Initial scaffold"
  git branch -M main
  git remote add origin <your-repo-url>
  git push -u origin main
  ```

### 3. Connect Vercel
- Go to vercel.com → New Project → import the GitHub repo you just
  created.
- Before deploying, add these two environment variables (from step 1):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Deploy. Vercel will redeploy automatically every time you push to
  `main`.

### 4. Turn on email login in Supabase
- In Supabase, go to **Authentication → Providers** and make sure
  **Email** is enabled (it is by default). That's all v1 needs — no
  password, just a magic link to the student's email.

### 5. Add the service role key
- In Supabase, go to **Project Settings → API** and copy the
  **`service_role`** key (different from the anon key — keep this one
  secret, never expose it to the browser).
- Add it to Vercel as `SUPABASE_SERVICE_ROLE_KEY`.
- This is what lets the app check membership status server-side without
  exposing the `memberships` table to logged-in users' browsers.

## Finish the membership sync

The gate is fully wired up: a scheduled job checks Kajabi every 15 minutes
and keeps the `memberships` table current, and every protected page checks
that table before rendering.

This uses Kajabi's own public API (not the Kajabi MCP tool used to look
things up in chat — a live deployment needs its own credentials):

1. In Kajabi, go to **Settings → Public API** and create API credentials
   (this needs the Pro plan, or the $25/mo Public API add-on on other
   plans). Copy the **Client ID** and **Client Secret**.
2. Add these to Vercel:
   - `KAJABI_CLIENT_ID`
   - `KAJABI_CLIENT_SECRET`
   - `KAJABI_SITE_ID` (`2147637375` — already set in `.env.local.example`)
   - `CRON_SECRET` (any random string — this stops anyone else from
     triggering the sync by hitting the URL directly; Vercel sends it
     automatically as a Bearer token when the cron job runs)
3. That's it — `vercel.json` already schedules the sync every 15 minutes,
   matching the cadence your Pricing Blueprint App uses.

The allowed offer IDs (New Thrive + SCALE, 5 offers total covering their
different price points) are listed as constants at the top of
`app/api/cron/sync-memberships/route.ts`. If you add or retire an offer in
Kajabi later, that's the one place to update.

To test it before waiting for the cron schedule, visit
`/api/cron/sync-memberships` directly in a browser once deployed — without
`CRON_SECRET` set, this works from anywhere, which is fine for testing but
means you should set `CRON_SECRET` before this app has real users.

## Running it on your own machine (optional, before deploying)

```
npm install
cp .env.local.example .env.local   # then fill in your Supabase values
npm run dev
```

## What's deliberately NOT in v1

- No CSV import — events are entered one at a time by hand.
- No editable taxonomy — categories are fixed (see `lib/taxonomy.ts`).
  If you want to add or change categories later, that file is the only
  place to touch.
- No connection to the separate profit calculator — profit is typed in
  by hand per event.

These were conscious scope cuts to keep v1 small enough to actually
ship. Happy to revisit any of them once this is live and being used.
