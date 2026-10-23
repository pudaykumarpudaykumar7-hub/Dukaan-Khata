// Customer-only cross-shop lookup. Deploy with Supabase Edge Functions.
// Required secret: SUPABASE_SERVICE_ROLE_KEY. Never expose this key to browser code.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}
function normalizePhone(value: unknown): string {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (digits.startsWith("0091") && digits.length === 14) digits = digits.slice(4);
  if (digits.startsWith("91") && digits.length === 12) digits = digits.slice(2);
  return digits;
}
function customerIdOf(tx: any): string {
  return String(tx?.customerId ?? tx?.customer_id ?? "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "Verify your mobile number with OTP first." }, 401);

    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anonKey || !serviceKey) return json({ error: "Customer portal server is not configured yet." }, 503);

    // Validate the caller's access token and require a verified phone identity.
    const authClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: { user }, error: userError } = await authClient.auth.getUser(token);
    if (userError || !user) return json({ error: "Your session expired. Please verify your OTP again." }, 401);
    const phone = normalizePhone(user.phone);
    if (!phone || user.phone_confirmed_at == null) return json({ error: "A verified mobile number is required." }, 403);

    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const matches: any[] = [];
    // The existing app stores each owner's records in a private JSON state row.
    // Scan in bounded pages server-side; never return a full owner state to the browser.
    const pageSize = 500;
    for (let from = 0; from < 5000; from += pageSize) {
      const { data, error } = await admin.from("dukaan_khata_state")
        .select("state").range(from, from + pageSize - 1);
      if (error) {
        console.error("Customer directory read failed", error.message);
        return json({ error: "Customer records are temporarily unavailable." }, 503);
      }
      const rows = data ?? [];
      for (const row of rows) {
        const state = row?.state && typeof row.state === "object" ? row.state : {};
        const deleted = new Set((Array.isArray(state.deletedCustomerIds) ? state.deletedCustomerIds : []).map(String));
        const customers = Array.isArray(state.customers) ? state.customers : [];
        for (const customer of customers) {
          if (!customer?.id || deleted.has(String(customer.id)) || normalizePhone(customer.phone) !== phone) continue;
          const cid = String(customer.id);
          const transactions = (Array.isArray(state.tx) ? state.tx : []).filter((t: any) => customerIdOf(t) === cid);
          const reminders = (Array.isArray(state.reminders) ? state.reminders : []).filter((r: any) => String(r?.customerId ?? r?.customer_id ?? "") === cid);
          matches.push({
            customer: { id: cid, name: String(customer.name ?? "Customer"), phone: String(customer.phone ?? "") },
            shop: {
              name: String(state.shop?.name ?? "Dukaan"),
              owner: String(state.shop?.owner ?? "Shop Owner"),
              phone: String(state.shop?.phone ?? ""),
              address: String(state.shop?.address ?? ""),
            },
            transactions,
            reminders,
          });
          if (matches.length >= 100) break;
        }
        if (matches.length >= 100) break;
      }
      if (rows.length < pageSize || matches.length >= 100) break;
    }
    // Do not disclose whether a number is registered if no records are found.
    return json({ accounts: matches });
  } catch (error) {
    console.error("Customer portal error", error);
    return json({ error: "Could not load your shop accounts. Please try again." }, 500);
  }
});
