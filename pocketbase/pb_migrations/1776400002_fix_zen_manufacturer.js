/// <reference path="../pb_data/types.d.ts" />
// The two older "Zen 65/75" hulls in Ceiba's pre-2018 stock are Jackson Kayaks,
// not Wave Sport. Wave Sport never made a Zen — Zen is Jackson's river-runner line.
migrate((app) => {
  const fixups = [
    {
      oldSlug: "ws-zen-65",
      newSlug: "jackson-zen-65",
      name: "Jackson Zen 65",
      manufacturer: "Jackson",
      description: "Older-gen Jackson Zen — planing-hull river-runner, fun and forgiving. (Pre-2018 stock from Ceiba.)",
    },
    {
      oldSlug: "ws-zen-75",
      newSlug: "jackson-zen-75",
      name: "Jackson Zen 75",
      manufacturer: "Jackson",
      description: "Older-gen Jackson Zen 75 — bigger version, full-volume comfort. (Pre-2018 stock from Ceiba.)",
    },
  ]

  for (const f of fixups) {
    try {
      const rec = app.findFirstRecordByFilter("boats", "slug = {:slug}", { slug: f.oldSlug })
      if (!rec) continue
      rec.set("slug", f.newSlug)
      rec.set("name", f.name)
      rec.set("manufacturer", f.manufacturer)
      rec.set("description", f.description)
      app.save(rec)
    } catch (err) {
      console.warn(`Couldn't update boat ${f.oldSlug}: ${err}`)
    }
  }
}, (app) => {
  const reverts = [
    { slug: "jackson-zen-65", oldSlug: "ws-zen-65", name: "Wave Sport Zen 65", manufacturer: "Wave Sport" },
    { slug: "jackson-zen-75", oldSlug: "ws-zen-75", name: "Wave Sport Zen 75", manufacturer: "Wave Sport" },
  ]
  for (const r of reverts) {
    try {
      const rec = app.findFirstRecordByFilter("boats", "slug = {:slug}", { slug: r.slug })
      if (!rec) continue
      rec.set("slug", r.oldSlug)
      rec.set("name", r.name)
      rec.set("manufacturer", r.manufacturer)
      app.save(rec)
    } catch (err) { /* ignore */ }
  }
})
