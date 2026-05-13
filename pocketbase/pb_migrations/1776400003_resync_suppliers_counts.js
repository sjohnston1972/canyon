/// <reference path="../pb_data/types.d.ts" />
// Re-sync supplier labels and stock counts after boats.txt got clarifying headers:
//   * The first source block is MOE (not Canyon REO — that's the third block).
//   * MOE and Ceiba each have "multiple of each available" — treat ≥2 per row.
//   * Canyon REO uses the explicit older+new column counts.
//   * Where a model appears in two sources, supplier = "A + B" and count = sum.
//   * Ceiba "Jackson Traverse 10" is the same model as Canyon REO's
//     BRAND NEW Karma Traverse — aggregate to one row.
migrate((app) => {
  const updates = [
    // ─── Playboat (MOE only) ────────────────────────────────────
    { slug: "jackson-all-star",         supplier: "MOE",                  count: 2 },
    { slug: "dagger-jitsu-6-0",         supplier: "MOE",                  count: 2 },
    { slug: "ll-homeslice",             supplier: "MOE",                  count: 2 },

    // ─── Half-Slice ─────────────────────────────────────────────
    { slug: "pyranha-ripper-2-sm",      supplier: "MOE + Canyon REO",     count: 4 },
    { slug: "pyranha-ripper-2-md",      supplier: "MOE + Canyon REO",     count: 4 },
    { slug: "pyranha-ripper-2-lg",      supplier: "MOE + Canyon REO",     count: 4 },
    { slug: "pyranha-firecracker-242",  supplier: "MOE",                  count: 2 },
    { slug: "pyranha-firecracker-252",  supplier: "MOE",                  count: 2 },
    { slug: "dagger-rewind-sm",         supplier: "MOE",                  count: 2 },
    { slug: "dagger-rewind-md",         supplier: "MOE",                  count: 2 },
    { slug: "dagger-rewind-lg",         supplier: "MOE",                  count: 2 },
    { slug: "waka-goat",                supplier: "MOE",                  count: 2 },
    { slug: "waka-steeze",              supplier: "MOE",                  count: 2 },
    { slug: "ll-braaap-69",             supplier: "MOE + Canyon REO",     count: 4 },
    { slug: "ll-rmx-76",                supplier: "Canyon REO",           count: 1 },
    { slug: "ll-rmx-86",                supplier: "Canyon REO",           count: 2 },
    { slug: "titan-rival",              supplier: "MOE",                  count: 2 },
    { slug: "jackson-antix-2-md",       supplier: "Ceiba",                count: 2 },

    // ─── River Runner ───────────────────────────────────────────
    { slug: "dagger-axiom-8-0",         supplier: "MOE",                  count: 2 },
    { slug: "dagger-axiom-8-5",         supplier: "MOE",                  count: 2 },
    { slug: "dagger-axiom-9-0",         supplier: "MOE",                  count: 2 },
    { slug: "dagger-rpm",               supplier: "MOE",                  count: 2 },
    { slug: "ll-remix-59",              supplier: "MOE",                  count: 2 },
    { slug: "ll-remix-69",              supplier: "MOE",                  count: 2 },
    { slug: "ll-remix-79",              supplier: "MOE + Canyon REO",     count: 5 },
    { slug: "jackson-zen-65",           supplier: "Ceiba",                count: 2 },
    { slug: "jackson-zen-75",           supplier: "Ceiba",                count: 2 },
    { slug: "jackson-zen-3-md",         supplier: "Ceiba",                count: 2 },
    { slug: "pyranha-scorch-x",         supplier: "Canyon REO",           count: 2 },

    // ─── Creek ──────────────────────────────────────────────────
    { slug: "dagger-mamba-7-6",         supplier: "Canyon REO",           count: 1 },
    { slug: "dagger-mamba-8-1",         supplier: "MOE",                  count: 2 },
    { slug: "ll-stomper-9-0",           supplier: "Canyon REO",           count: 1 },
    { slug: "jackson-karma-l",          supplier: "Ceiba",                count: 2 },

    // ─── Expedition / Self-Support ──────────────────────────────
    {
      slug: "ll-remix-xp-10",
      supplier: "Ceiba + Canyon REO",
      count: 4,
      description: "Self-support expedition kayak — carries 18 days of food/kit. Canyon REO has 2 (older hulls), Ceiba has at least 2. $450 surcharge incl. IR spray skirt.",
    },
    {
      slug: "ll-stinger-xp",
      supplier: "Ceiba + Canyon REO",
      count: 6,
      description: "Faster, more knife-like self-support boat. Ceiba has 4 (orange, orange, green/blue, purple/blue), Canyon REO has 2 (BRAND NEW). $450 surcharge incl. IR spray skirt.",
    },
    {
      slug: "jackson-karma-trav-10",
      supplier: "Ceiba + Canyon REO",
      count: 10,
      description: "Brand-new Jackson self-support fleet — Canyon REO has 8 (BRAND NEW), Ceiba has 2 (purple/blue and orange/red). Roomy storage, planted on big water. $450 surcharge incl. IR spray skirt.",
    },
  ]

  for (const u of updates) {
    try {
      const rec = app.findFirstRecordByFilter("boats", "slug = {:slug}", { slug: u.slug })
      if (!rec) continue
      rec.set("supplier", u.supplier)
      rec.set("available_count", u.count)
      if (u.description) rec.set("description", u.description)
      app.save(rec)
    } catch (err) {
      console.warn(`Couldn't update boat ${u.slug}: ${err}`)
    }
  }
}, (app) => {
  // No clean rollback — these counts are user-clarified, not derivable from code.
})
