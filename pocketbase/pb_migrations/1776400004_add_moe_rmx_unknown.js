/// <reference path="../pb_data/types.d.ts" />
// MOE lists "Liquid Logic RMX" without specifying 76 or 86 — add it as a
// separate row with size "Unknown" so paddlers can still pick it. The RMX 76
// and RMX 86 rows from Canyon REO stay as their own size-specific entries.
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_boats")

  // Idempotency — don't re-insert if it's already there
  try {
    const existing = app.findFirstRecordByFilter("boats", "slug = {:slug}", { slug: "ll-rmx-moe" })
    if (existing) return
  } catch (err) {
    // not found — fall through and insert
  }

  const rec = new Record(collection, {
    slug: "ll-rmx-moe",
    name: "Liquid Logic RMX",
    manufacturer: "Liquid Logic",
    model: "RMX",
    size: "Unknown",
    category: "Half-Slice",
    description: "MOE stocks the RMX without specifying 76 vs 86 — confirm size on pickup. Half-slice river-runner with comfortable cockpit.",
    supplier: "MOE",
    available_count: 2,
    sort_order: 22,
  })
  app.save(rec)
}, (app) => {
  try {
    const rec = app.findFirstRecordByFilter("boats", "slug = {:slug}", { slug: "ll-rmx-moe" })
    if (rec) app.delete(rec)
  } catch (err) { /* ignore */ }
})
