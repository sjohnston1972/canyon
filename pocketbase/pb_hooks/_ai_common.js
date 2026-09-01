// Shared helpers for the AI proxy routes (/api/chat, /api/parse-ledger).
// This file does NOT end in .pb.js, so PocketBase does not auto-load it as a hook —
// it's pulled in via require(`${__hooks}/_ai_common.js`) from chat.pb.js and
// parse_ledger.pb.js instead. See issues #10, #11, #12.
//
// Authentication itself is handled by PocketBase's own $apis.requireAuth() middleware
// passed to routerAdd (see the "users" auth collection wired up by AuthGate.tsx) — this
// file only covers what's left: per-identity rate limiting.

// Caller identity for rate limiting: the authenticated record's id (guaranteed present,
// since $apis.requireAuth() rejects unauthenticated requests before the handler runs),
// falling back to the nginx-set X-Real-IP / X-Forwarded-For in case a route is ever
// exempted from that middleware.
function callerIdentity(e) {
  if (e.auth && e.auth.id) return e.auth.id
  const realIp = e.request.header.get("X-Real-IP")
  if (realIp) return realIp
  const fwd = e.request.header.get("X-Forwarded-For")
  if (fwd) return fwd.split(",")[0].trim()
  return "unknown"
}

// Simple fixed-window rate limiter backed by the app's in-memory store ($app.store()),
// which is a single Go-level object shared across the whole process — unlike plain
// top-level JS variables, it stays consistent no matter which JSVM pool instance
// handles a given request. State is intentionally NOT persisted to disk: it resets on
// restart, which is fine for a request-throttling guard.
//
// Returns true if this request is within limits (and records it against the window),
// false if it should be rejected with 429.
function checkRateLimit(routeLabel, identity, maxRequests, windowSeconds) {
  const store = $app.store()
  const key = "ratelimit:" + routeLabel + ":" + identity
  const now = Date.now()

  let windowStart = now
  let count = 0

  const raw = store.get(key)
  if (raw) {
    const parts = String(raw).split(":")
    const savedStart = parseInt(parts[0], 10)
    const savedCount = parseInt(parts[1], 10)
    if (!isNaN(savedStart) && !isNaN(savedCount) && now - savedStart < windowSeconds * 1000) {
      windowStart = savedStart
      count = savedCount
    }
  }

  count++
  store.set(key, windowStart + ":" + count)
  return count <= maxRequests
}

module.exports = {
  callerIdentity: callerIdentity,
  checkRateLimit: checkRateLimit,
}
