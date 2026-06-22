/// <reference path="../pb_data/types.d.ts" />
// Availability update from "boats updated 22-06-2026.txt" (true per-boat counts from the
// three suppliers). Mostly a downward correction: the earlier catalogue assumed 2 of nearly
// everything at MOE, but most MOE boats are singletons. Boat CHOICES are intentionally left
// untouched. Only available_count changes; each entry records its previous value for rollback.
migrate((app) => {
  // { slug, count: new value, prev: previous value }
  const updates = [
    { slug: "jackson-all-star",       count: 1, prev: 2 },
    { slug: "dagger-jitsu-6-0",       count: 1, prev: 2 },
    { slug: "ll-homeslice",           count: 1, prev: 2 },
    { slug: "pyranha-ripper-2-sm",    count: 3, prev: 4 },
    { slug: "pyranha-ripper-2-md",    count: 3, prev: 4 },
    { slug: "pyranha-firecracker-242",count: 1, prev: 2 },
    { slug: "pyranha-firecracker-252",count: 1, prev: 2 },
    { slug: "dagger-rewind-sm",       count: 1, prev: 2 },
    { slug: "dagger-rewind-md",       count: 3, prev: 2 }, // the one increase
    { slug: "waka-steeze",            count: 1, prev: 2 },
    { slug: "ll-braaap-69",           count: 3, prev: 4 },
    { slug: "titan-rival",            count: 1, prev: 2 },
    { slug: "jackson-antix-2-md",     count: 1, prev: 2 },
    { slug: "dagger-axiom-8-0",       count: 1, prev: 2 },
    { slug: "dagger-axiom-8-5",       count: 1, prev: 2 },
    { slug: "dagger-axiom-9-0",       count: 1, prev: 2 },
    { slug: "dagger-rpm",             count: 1, prev: 2 },
    { slug: "ll-remix-59",            count: 1, prev: 2 },
    { slug: "ll-remix-79",            count: 4, prev: 5 },
    { slug: "ll-rmx-moe",             count: 1, prev: 2 },
    { slug: "jackson-zen-75",         count: 1, prev: 2 },
    { slug: "jackson-zen-3-md",       count: 1, prev: 2 },
    { slug: "dagger-mamba-8-1",       count: 1, prev: 2 },
    { slug: "jackson-karma-l",        count: 1, prev: 2 },
    { slug: "ll-remix-xp-10",         count: 3, prev: 4 },
  ]

  for (const u of updates) {
    try {
      const rec = app.findFirstRecordByFilter("boats", "slug = {:slug}", { slug: u.slug })
      if (!rec) { console.warn(`No boat with slug ${u.slug}`); continue }
      rec.set("available_count", u.count)
      app.save(rec)
    } catch (err) {
      console.warn(`Couldn't update boat ${u.slug}: ${err}`)
    }
  }
}, (app) => {
  const updates = [
    { slug: "jackson-all-star",       prev: 2 },
    { slug: "dagger-jitsu-6-0",       prev: 2 },
    { slug: "ll-homeslice",           prev: 2 },
    { slug: "pyranha-ripper-2-sm",    prev: 4 },
    { slug: "pyranha-ripper-2-md",    prev: 4 },
    { slug: "pyranha-firecracker-242",prev: 2 },
    { slug: "pyranha-firecracker-252",prev: 2 },
    { slug: "dagger-rewind-sm",       prev: 2 },
    { slug: "dagger-rewind-md",       prev: 2 },
    { slug: "waka-steeze",            prev: 2 },
    { slug: "ll-braaap-69",           prev: 4 },
    { slug: "titan-rival",            prev: 2 },
    { slug: "jackson-antix-2-md",     prev: 2 },
    { slug: "dagger-axiom-8-0",       prev: 2 },
    { slug: "dagger-axiom-8-5",       prev: 2 },
    { slug: "dagger-axiom-9-0",       prev: 2 },
    { slug: "dagger-rpm",             prev: 2 },
    { slug: "ll-remix-59",            prev: 2 },
    { slug: "ll-remix-79",            prev: 5 },
    { slug: "ll-rmx-moe",             prev: 2 },
    { slug: "jackson-zen-75",         prev: 2 },
    { slug: "jackson-zen-3-md",       prev: 2 },
    { slug: "dagger-mamba-8-1",       prev: 2 },
    { slug: "jackson-karma-l",        prev: 2 },
    { slug: "ll-remix-xp-10",         prev: 4 },
  ]
  for (const u of updates) {
    try {
      const rec = app.findFirstRecordByFilter("boats", "slug = {:slug}", { slug: u.slug })
      if (!rec) continue
      rec.set("available_count", u.prev)
      app.save(rec)
    } catch (err) {
      console.warn(`Couldn't roll back boat ${u.slug}: ${err}`)
    }
  }
})
