import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cors });
const normalizePhone = (v: unknown) => {
  let d = String(v ?? "").replace(/\D/g, "");
  if (d.startsWith("0091") && d.length === 14) d = d.slice(4);
  if (d.startsWith("91") && d.length === 12) d = d.slice(2);
  return d;
};
const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const unb64 = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function hashPin(pin: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 150000, hash: "SHA-256" }, key, 256);
  return b64(new Uint8Array(bits));
}
function same(a: string, b: string) {
  if (a.length !== b.length) return false;
  let x = 0;
  for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return x === 0;
}
function cid(t: any) { return String(t?.customerId ?? t?.customer_id ?? ""); }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anon || !service) return json({ error: "Customer PIN service is not configured." }, 503);
    const body = await req.json();
    const action = String(body?.action ?? "");
    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });

    if (action !== "login") return json({ error: "Unknown action." }, 400);
    const phone = normalizePhone(body?.phone);
    const pin = String(body?.pin ?? "");
    if (phone.length !== 10 || pin !== "2007") return json({ error: "Enter a valid 10-digit mobile number and the common customer PIN." }, 401);
    const { data: states, error: stateErr } = await admin.from("dukaan_khata_state").select("user_id,state").limit(1000);
    if (stateErr) return json({ error: "Customer records are temporarily unavailable." }, 503);
    const matches: any[] = [];
    for (const row of states ?? []) {
      const state = row?.state && typeof row.state === "object" ? row.state : {};
      const deleted = new Set((Array.isArray(state.deletedCustomerIds) ? state.deletedCustomerIds : []).map(String));
      const customers = Array.isArray(state.customers) ? state.customers : [];
      for (const customer of customers) {
        if (!customer?.id || deleted.has(String(customer.id)) || normalizePhone(customer.phone) !== phone) continue;
        const customerId = String(customer.id);
        const transactions = (Array.isArray(state.tx) ? state.tx : []).filter((t: any) => cid(t) === customerId);
        matches.push({
          customer: { id: customerId, name: String(customer.name ?? "Customer"), phone },
          shop: { name: String(state.shop?.name ?? "Dukaan"), owner: String(state.shop?.owner ?? "Shop Owner"), phone: String(state.shop?.phone ?? ""), address: String(state.shop?.address ?? "") },
          transactions,
          reminders: (Array.isArray(state.reminders) ? state.reminders : []).filter((r: any) => String(r?.customerId ?? r?.customer_id ?? "") === customerId)
        });
      }
    }
    return json({ accounts: matches });
  } catch (e) {
    console.error("customer-pin-portal error", e);
    return json({ error: "Could not load your Khata. Please try again." }, 500);
  }
});