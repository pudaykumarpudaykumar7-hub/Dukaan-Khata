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
exports.registerSupabasePushToken = onRequest({ region: "us-central1", maxInstances: 10 }, async (req, res) => {
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
    const excludedTokenId = typeof req.body?.excludeToken === "string" && req.body.excludeToken.length >= 50 ? crypto.createHash("sha256").update(req.body.excludeToken).digest("hex") : "";
    const tokens = snap.docs.map((doc) => ({ ref: doc.ref, id: doc.id, token: doc.get("token") })).filter((x) => x.token && x.id !== excludedTokenId);
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


function normalizeCustomerPhone(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 13 && digits.startsWith("0091")) digits = digits.slice(4);
  if (!/^\d{10}$/.test(digits)) {
    const error = new Error("A valid 10-digit Indian customer mobile number is required.");
    error.status = 400;
    throw error;
  }
  return digits;
}
function verifySharedCustomerPin(value) {
  if (String(value || "") !== "2007") {
    const error = new Error("Customer PIN is incorrect.");
    error.status = 401;
    throw error;
  }
}
function customerDocId(phone) {
  return crypto.createHash("sha256").update(phone).digest("hex");
}

/**
 * Customer device registration uses the existing shared customer PIN.
 * Because 2007 is shared, it is a convenience gate, not strong identity proof.
 */
exports.registerCustomerPushDevice = onRequest({ region: "us-central1", maxInstances: 10 }, async (req, res) => {
  if (applyCors(req, res)) return;
  try {
    const phone = normalizeCustomerPhone(req.body?.phone);
    verifySharedCustomerPin(req.body?.pin);
    const token = cleanToken(req.body?.token);
    const customerId = customerDocId(phone);
    const tokenId = crypto.createHash("sha256").update(token).digest("hex");
    await db.collection("customerPush").doc(customerId).collection("devices").doc(tokenId).set({
      token, phone, platform: String(req.body?.platform || "web").slice(0, 30),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    res.status(200).json({ ok: true });
  } catch (error) { sendError(res, error); }
});

/** Read a customer's notification inbox with the agreed common PIN. */
exports.getCustomerNotifications = onRequest({ region: "us-central1", maxInstances: 10 }, async (req, res) => {
  if (applyCors(req, res)) return;
  try {
    const phone = normalizeCustomerPhone(req.body?.phone);
    verifySharedCustomerPin(req.body?.pin);
    const customerId = customerDocId(phone);
    const snap = await db.collection("customerPush").doc(customerId).collection("inbox").orderBy("createdAt", "desc").limit(50).get();
    res.status(200).json({ ok: true, notifications: snap.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: doc.get("createdAt")?.toDate?.().toISOString() || null })) });
  } catch (error) { sendError(res, error); }
});


/** Delete one notification from the authenticated customer's own inbox. */
exports.deleteCustomerNotification = onRequest({ region: "us-central1", maxInstances: 10 }, async (req, res) => {
  if (applyCors(req, res)) return;
  try {
    const phone = normalizeCustomerPhone(req.body?.phone);
    verifySharedCustomerPin(req.body?.pin);
    const notificationId = String(req.body?.notificationId || "");
    if (!/^[A-Za-z0-9_-]{1,150}$/.test(notificationId)) {
      const error = new Error("Invalid notification.");
      error.status = 400;
      throw error;
    }
    const customerId = customerDocId(phone);
    await db.collection("customerPush").doc(customerId).collection("inbox").doc(notificationId).delete();
    res.status(200).json({ ok: true });
  } catch (error) { sendError(res, error); }
});

/** Clear only this customer's notification inbox; bills and account data are untouched. */
exports.clearCustomerNotifications = onRequest({ region: "us-central1", maxInstances: 10 }, async (req, res) => {
  if (applyCors(req, res)) return;
  try {
    const phone = normalizeCustomerPhone(req.body?.phone);
    verifySharedCustomerPin(req.body?.pin);
    const customerId = customerDocId(phone);
    const inbox = db.collection("customerPush").doc(customerId).collection("inbox");
    const snap = await inbox.limit(500).get();
    if (!snap.empty) {
      const batch = db.batch();
      snap.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }
    res.status(200).json({ ok: true, deleted: snap.size });
  } catch (error) { sendError(res, error); }
});

/**
 * Owner-authenticated delivery endpoint. The caller must have a valid Supabase
 * owner session. It sends only to the supplied customer's registered devices.
 * Customer-specific ownership matching should be enforced by the portal/data
 * layer before calling this endpoint.
 */
exports.sendCustomerAccountNotification = onRequest({ region: "us-central1", maxInstances: 10 }, async (req, res) => {
  if (applyCors(req, res)) return;
  try {
    await requireSupabaseUser(req);
    const phone = normalizeCustomerPhone(req.body?.phone);
    const title = String(req.body?.title || "Dukaan Khata account updated").slice(0, 100);
    const body = String(req.body?.body || "Your bill or outstanding balance has been updated. Open Dukaan Khata to view details.").slice(0, 350);
    const customerId = customerDocId(phone);
    const inbox = db.collection("customerPush").doc(customerId).collection("inbox");
    const noticeRef = inbox.doc();
    await noticeRef.set({ title, body, read: false, createdAt: FieldValue.serverTimestamp() });
    const snap = await db.collection("customerPush").doc(customerId).collection("devices").get();
    const devices = snap.docs.map(doc => ({ ref: doc.ref, id: doc.id, token: doc.get("token") })).filter(x => x.token);
    if (!devices.length) {
      res.status(200).json({ ok: true, sent: 0, saved: true });
      return;
    }
    const notificationId = noticeRef.id;
    const result = await getMessaging().sendEachForMulticast({
      tokens: devices.map(x => x.token),
      notification: { title, body },
      data: { title, body, url: "./?customerNotifications=1", notificationId },
      webpush: {
        notification: {
          title,
          body,
          icon: "./icon.svg",
          badge: "./icon.svg",
          tag: "dukaan-customer-" + notificationId,
          renotify: true
        },
        headers: {
          "Urgency": "high",
          "TTL": "86400"
        },
        fcmOptions: { link: "./?customerNotifications=1" }
      }
    });
    const removals = [];
    result.responses.forEach((response, index) => {
      const code = response.error?.code || "";
      if (!response.success && (code.includes("registration-token-not-registered") || code.includes("invalid-registration-token"))) removals.push(devices[index].ref.delete());
    });
    await Promise.all(removals);
    res.status(200).json({ ok: true, sent: result.successCount, failed: result.failureCount, saved: true });
  } catch (error) { sendError(res, error); }
});
