function cors(req, res) {
  const allowed = process.env.ALLOWED_ORIGIN || "https://pudaykumarpudaykumar7-hub.github.io";
  const origin = req.headers.origin || "";
  if (origin === allowed) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "600");
}
function preflight(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }
  return false;
}
module.exports = { cors, preflight };
