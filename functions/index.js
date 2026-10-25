"use strict";

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();
const db = getFirestore();

function requireAuth(request) {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Sign in is required.");
  }
  return request.auth.uid;
}

function cleanToken(value) {
  if (typeof value !== "string" || value.length < 50 || value.length > 4096) {
    throw new HttpsError("invalid-argument", "A valid FCM registration token is required.");
  }
  return value;
}

/**
 * Store only a device's push token. This does not sync bills, customers,
 * owner profiles, or any other app data.
 */
exports.registerPushToken = onCall({ maxInstances: 10 }, async (request) => {
  const uid = requireAuth(request);
  const token = cleanToken(request.data?.token);
  const tokenId = require("node:crypto").createHash("sha256").update(token).digest("hex");
  await db.collection("pushTokens").doc(uid).collection("devices").doc(tokenId).set({
    token,
    platform: String(request.data?.platform || "web").slice(0, 30),
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });
  return { ok: true };
});

/**
 * Admin-only sender. Grant the trusted operator account the Firebase custom
 * claim { pushAdmin: true } using a trusted Admin SDK environment.
 * Never expose service-account credentials in client-side code.
 */
exports.sendPushToUser = onCall({ maxInstances: 5 }, async (request) => {
  const uid = requireAuth(request);
  if (request.auth.token.pushAdmin !== true) {
    throw new HttpsError("permission-denied", "Push administrator access is required.");
  }

  const targetUid = String(request.data?.targetUid || "").trim();
  const title = String(request.data?.title || "").trim().slice(0, 120);
  const body = String(request.data?.body || "").trim().slice(0, 500);
  const url = String(request.data?.url || "/").trim().slice(0, 300);

  if (!targetUid || !title || !body) {
    throw new HttpsError("invalid-argument", "targetUid, title and body are required.");
  }

  const snap = await db.collection("pushTokens").doc(targetUid).collection("devices").get();
  const tokens = snap.docs.map((doc) => ({ id: doc.id, token: doc.get("token") })).filter((x) => x.token);
  if (!tokens.length) return { ok: true, sent: 0, message: "No registered devices." };

  const result = await getMessaging().sendEachForMulticast({
    tokens: tokens.map((x) => x.token),
    notification: { title, body },
    data: { title, body, url }
  });

  const removals = [];
  result.responses.forEach((response, index) => {
    const code = response.error?.code || "";
    if (!response.success && (
      code.includes("registration-token-not-registered") ||
      code.includes("invalid-registration-token")
    )) {
      removals.push(snap.docs.find((doc) => doc.id === tokens[index].id)?.ref.delete());
    }
  });
  await Promise.all(removals.filter(Boolean));
  return { ok: true, sent: result.successCount, failed: result.failureCount };
});
