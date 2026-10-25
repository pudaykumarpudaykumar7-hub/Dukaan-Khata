"use strict";

const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const crypto = require("node:crypto");

initializeApp();
const db = getFirestore();

const SUPABASE_URL = "https://nzsldzyjpxwyyrdwkphp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_k3ZPG1Wuqm3KFzoQAXnByA_YTMLkUG-";
const ALLOWED_ORIGINS = new Set([
  "https://pudaykumarpudaykumar7-hub.github.io",
  "https://pudaykumarpudaykumar7-hub.vercel.app",
  "capacitor://localhost",
  "https://localhost",
  "http://localhost"
]);

function applyCors(req, res) {
  const origin = String(req.get("origin") || "");
  if (ALLOWED_ORIGINS.has(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Vary", "Origin");
  }
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.set("Access-Control-Max-Age", "3600");
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return true;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST required." });
    return true;
  }
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    res.status(403).json({ error: "Origin not allowed." });
    return true;
  }
  return false;
}

/**
 * Validate the bearer token with Supabase Auth itself. Do not trust decoded
 * JWT claims or accept a client-supplied user ID as proof of identity.
 */
async function requireSupabaseUser(req) {
  const authorization = String(req.get("authorization") || "");
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    const error = new Error("A signed-in owner session is required.");
    error.status = 401;
    throw error;
  }
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: "GET",
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${match[1]}`
    }
  });
  if (!response.ok) {
    const error = new Error("The sign-in session is invalid or expired.");
    error.status = 401;
    throw error;
  }
  const user = await response.json();
  if (!user || typeof user.id !== "string" || !user.id) {
    const error = new Error("Could not verify the signed-in user.");
    error.status = 401;
    throw error;
  }
  return user;
}

function sendError(res, error) {
  const status = Number(error?.status) || 500;
  if (status >= 500) console.error("Push API request failed:", error);
  res.status(status).json({
    error: status >= 500 ? "Push service temporarily unavailable." : error.message
  });
}

function cleanToken(value) {
  if (typeof value !== "string" || value.length < 50 || value.length > 4096) {
    const error = new Error("A valid FCM registration token is required.");
    error.status = 400;
    throw error;
  }
  return value;
}

/**
 * Authenticated device registration. Only FCM token metadata is stored;
 * shop records, bills, customers and balances remain device-local.
 */
exports.registerPushToken = onRequest({ region: "us-central1", maxInstances: 10 }, async (req, res) => {
  if (applyCors(req, res)) return;
  try {
    const user = await requireSupabaseUser(req);
    const token = cleanToken(req.body?.token);
    const tokenId = crypto.createHash("sha256").update(token).digest("hex");
    await db.collection("pushTokens").doc(user.id).collection("devices").doc(tokenId).set({
      token,
      platform: String(req.body?.platform || "web").slice(0, 30),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    res.status(200).json({ ok: true });
  } catch (error) {
    sendError(res, error);
  }
});

/**
 * Send a bill/payment notification only to devices registered to the verified
 * caller. The client cannot choose another recipient or arbitrary message.
 */
exports.sendSelfNotification = onRequest({ region: "us-central1", maxInstances: 10 }, async (req, res) => {
  if (applyCors(req, res)) return;
  try {
    const user = await requireSupabaseUser(req);
    const kind = String(req.body?.kind || "");
    const allowed = {
      bill: { title: "New bill saved", body: "A bill was saved in your Dukaan Khata." },
      payment: { title: "Payment recorded", body: "A payment was recorded in your Dukaan Khata." },
      reminder: { title: "Important reminder", body: "You have an important Dukaan Khata reminder." }
    };
    const notice = allowed[kind];
    if (!notice) {
      const error = new Error("Unsupported notification type.");
      error.status = 400;
      throw error;
    }

    const snap = await db.collection("pushTokens").doc(user.id).collection("devices").get();
    const tokens = snap.docs.map((doc) => ({ ref: doc.ref, token: doc.get("token") })).filter((x) => x.token);
    if (!tokens.length) {
      res.status(200).json({ ok: true, sent: 0, message: "No registered devices." });
      return;
    }

    const result = await getMessaging().sendEachForMulticast({
      tokens: tokens.map((x) => x.token),
      notification: notice,
      data: { title: notice.title, body: notice.body, url: "./?notifications=1" }
    });

    const removals = [];
    result.responses.forEach((response, index) => {
      const code = response.error?.code || "";
      if (!response.success && (
        code.includes("registration-token-not-registered") ||
        code.includes("invalid-registration-token")
      )) removals.push(tokens[index].ref.delete());
    });
    await Promise.all(removals);
    res.status(200).json({ ok: true, sent: result.successCount, failed: result.failureCount });
  } catch (error) {
    sendError(res, error);
  }
});
