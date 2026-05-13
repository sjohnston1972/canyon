/// <reference path="../pb_data/types.d.ts" />
// User: "rename RMX to Remix". Update model + display name on the three rows.
// Slugs stay the same so existing boat_choices references aren't disturbed.
migrate((app) => {
  const updates = [
    { slug: "ll-rmx-76",  name: "Liquid Logic Remix 76", description: "Half-slice river-runner with comfortable cockpit. 76 for ~70–90kg." },
    { slug: "ll-rmx-86",  name: "Liquid Logic Remix 86", description: "Remix 86 fits larger paddlers ~85–110kg." },
    { slug: "ll-rmx-moe", name: "Liquid Logic Remix",    description: "MOE stocks the Remix without specifying size — confirm size on pickup. Half-slice river-runner with comfortable cockpit." },
  ]
  for (const u of updates) {
    try {
      const rec = app.findFirstRecordByFilter("boats", "slug = {:slug}", { slug: u.slug })
      if (!rec) continue
      rec.set("name", u.name)
      rec.set("model", "Remix")
      rec.set("description", u.description)
      app.save(rec)
    } catch (err) {
      console.warn(`Couldn't rename ${u.slug}: ${err}`)
    }
  }
}, (app) => {
  const reverts = [
    { slug: "ll-rmx-76",  name: "Liquid Logic RMX 76", description: "RMX is LL's modern half-slice — comfortable cockpit. 76 for ~70–90kg." },
    { slug: "ll-rmx-86",  name: "Liquid Logic RMX 86", description: "RMX 86 fits larger paddlers ~85–110kg." },
    { slug: "ll-rmx-moe", name: "Liquid Logic RMX",    description: "MOE stocks the RMX without specifying 76 vs 86 — confirm size on pickup. Half-slice river-runner with comfortable cockpit." },
  ]
  for (const r of reverts) {
    try {
      const rec = app.findFirstRecordByFilter("boats", "slug = {:slug}", { slug: r.slug })
      if (!rec) continue
      rec.set("name", r.name)
      rec.set("model", "RMX")
      rec.set("description", r.description)
      app.save(rec)
    } catch (err) { /* ignore */ }
  }
})
