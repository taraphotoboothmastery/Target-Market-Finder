// Server-only client for Kajabi's Public API (OAuth2 client-credentials
// grant). Used only by app/api/cron/sync-memberships — never imported
// from a "use client" file.
//
// NOTE: verify these endpoint paths and payload shapes against Kajabi's
// current Public API reference before relying on this in production —
// this was written from the general shape of Kajabi's documented API
// (OAuth2 client-credentials + REST resources under api.kajabi.com) and
// has not been run against a live Kajabi account. The offer IDs below
// are the ones named in the README (New Thrive + SCALE); update them if
// the app's offers change.

const KAJABI_API_BASE = "https://api.kajabi.com";

export const ALLOWED_OFFER_IDS = [
  "2151111655", // Photo Booth Mastery - The New Thrive ($2,500/yr, full membership)
  "2151332113", // Thrive - Founding Members Rate ($150/mo, full membership)
  "2151314626", // Hub - The New Thrive 2026 - Signature ($149/mo, VIP Alumni full inclusion)
  "2151314224", // Thrive 2026 Coaching Calls Upgrade ($49/mo, VIP Alumni add-on — also grants access)
  "2150660407", // SCALE Monthly Payment Plan ($497/mo)
  "2151009853", // SCALE - Pay in Full ($4,999)
  // New Thrive + SCALE, including the $49 coaching-call upgrade add-on.
  // Update this list here if an offer is added or retired.
] as const;

type KajabiToken = { access_token: string; expires_in: number };

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.value;
  }

  const clientId = process.env.KAJABI_CLIENT_ID;
  const clientSecret = process.env.KAJABI_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Missing KAJABI_CLIENT_ID or KAJABI_CLIENT_SECRET");
  }

  const res = await fetch(`${KAJABI_API_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    throw new Error(`Kajabi token request failed: ${res.status} ${await res.text()}`);
  }

  const token = (await res.json()) as KajabiToken;
  cachedToken = {
    value: token.access_token,
    expiresAt: Date.now() + token.expires_in * 1000,
  };
  return token.access_token;
}

export type KajabiPurchase = {
  contactId: string;
  email: string;
  offerId: string;
  active: boolean;
};

// Fetches every active-or-not purchase of the given offers for the
// configured site, paginating until the API stops returning results.
export async function fetchPurchasesForOffers(
  siteId: string,
  offerIds: readonly string[]
): Promise<KajabiPurchase[]> {
  const token = await getAccessToken();
  const purchases: KajabiPurchase[] = [];

  for (const offerId of offerIds) {
    let page = 1;
    while (true) {
      const res = await fetch(
        `${KAJABI_API_BASE}/sites/${siteId}/offers/${offerId}/purchases?page=${page}&per_page=100`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) {
        throw new Error(
          `Kajabi purchases request failed for offer ${offerId}: ${res.status} ${await res.text()}`
        );
      }

      const body = (await res.json()) as {
        data?: Array<{
          contact_id: string;
          email: string;
          status: string; // e.g. "active", "cancelled", "refunded"
        }>;
      };

      const rows = body.data ?? [];
      if (rows.length === 0) break;

      for (const row of rows) {
        purchases.push({
          contactId: row.contact_id,
          email: row.email.toLowerCase(),
          offerId,
          active: row.status === "active",
        });
      }

      if (rows.length < 100) break;
      page += 1;
    }
  }

  return purchases;
}
