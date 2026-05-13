/// <reference path="../pb_data/types.d.ts" />
// Boats catalogue — kayak models available across Canyon REO and Ceiba outfitters.
// One row per model+size combination. available_count aggregates stock across suppliers.
migrate((app) => {
  const collection = new Collection({
    "createRule": "",
    "deleteRule": "",
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "hidden": false,
        "id": "text3208210256",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      { "autogeneratePattern": "", "hidden": false, "id": "text_b_slug",  "max": 0, "min": 0, "name": "slug",            "pattern": "", "presentable": true,  "primaryKey": false, "required": true,  "system": false, "type": "text" },
      { "autogeneratePattern": "", "hidden": false, "id": "text_b_name",  "max": 0, "min": 0, "name": "name",            "pattern": "", "presentable": true,  "primaryKey": false, "required": true,  "system": false, "type": "text" },
      { "autogeneratePattern": "", "hidden": false, "id": "text_b_make",  "max": 0, "min": 0, "name": "manufacturer",    "pattern": "", "presentable": false, "primaryKey": false, "required": false, "system": false, "type": "text" },
      { "autogeneratePattern": "", "hidden": false, "id": "text_b_model", "max": 0, "min": 0, "name": "model",           "pattern": "", "presentable": false, "primaryKey": false, "required": false, "system": false, "type": "text" },
      { "autogeneratePattern": "", "hidden": false, "id": "text_b_size",  "max": 0, "min": 0, "name": "size",            "pattern": "", "presentable": false, "primaryKey": false, "required": false, "system": false, "type": "text" },
      { "autogeneratePattern": "", "hidden": false, "id": "text_b_cat",   "max": 0, "min": 0, "name": "category",        "pattern": "", "presentable": false, "primaryKey": false, "required": true,  "system": false, "type": "text" },
      { "autogeneratePattern": "", "hidden": false, "id": "text_b_desc",  "max": 0, "min": 0, "name": "description",     "pattern": "", "presentable": false, "primaryKey": false, "required": false, "system": false, "type": "text" },
      { "autogeneratePattern": "", "hidden": false, "id": "text_b_sup",   "max": 0, "min": 0, "name": "supplier",        "pattern": "", "presentable": false, "primaryKey": false, "required": false, "system": false, "type": "text" },
      { "hidden": false, "id": "num_b_cnt", "max": null, "min": 0,    "name": "available_count", "onlyInt": true, "presentable": false, "required": false, "system": false, "type": "number" },
      { "hidden": false, "id": "num_b_ord", "max": null, "min": null, "name": "sort_order",      "onlyInt": true, "presentable": false, "required": false, "system": false, "type": "number" }
    ],
    "id": "pbc_boats",
    "indexes": [
      "CREATE UNIQUE INDEX `idx_boats_slug` ON `boats` (`slug`)"
    ],
    "listRule": "",
    "name": "boats",
    "system": false,
    "type": "base",
    "updateRule": "",
    "viewRule": ""
  })

  app.save(collection)

  // Categories: "Playboat" | "Half-Slice" | "River Runner" | "Creek" | "Expedition"
  const seed = [
    // ─── Playboats (MOE) ─────────────────────────────────────────
    { slug: "jackson-all-star",      name: "Jackson All-Star",        manufacturer: "Jackson",      model: "All-Star",       size: "",        category: "Playboat",     description: "Pro-level freestyle playboat — short, low-volume, designed for tricks.",                              supplier: "MOE",                  available_count: 2,  sort_order: 1 },
    { slug: "dagger-jitsu-6-0",      name: "Dagger Jitsu 6.0",        manufacturer: "Dagger",       model: "Jitsu",          size: "6.0",     category: "Playboat",     description: "Modern freestyle playboat with planing hull.",                                                          supplier: "MOE",                  available_count: 2,  sort_order: 2 },
    { slug: "ll-homeslice",          name: "Liquid Logic Homeslice",  manufacturer: "Liquid Logic", model: "Homeslice",      size: "",        category: "Playboat",     description: "Sliced-stern freestyle boat — playful, loose, hole-friendly.",                                          supplier: "MOE",                  available_count: 2,  sort_order: 3 },

    // ─── Half-Slice / Modern Sliced-Stern River Runners ──────────
    { slug: "pyranha-ripper-2-sm",   name: "Pyranha Ripper 2 Small",  manufacturer: "Pyranha",      model: "Ripper 2",       size: "Small",   category: "Half-Slice",   description: "Planing hull with sliced stern — surfs, squirts, runs grade IV. Small fits paddlers ~50–70kg.",         supplier: "MOE + Canyon REO",     available_count: 4,  sort_order: 10 },
    { slug: "pyranha-ripper-2-md",   name: "Pyranha Ripper 2 Medium", manufacturer: "Pyranha",      model: "Ripper 2",       size: "Medium",  category: "Half-Slice",   description: "Planing hull with sliced stern — the most popular half-slice on the Canyon. ~65–90kg.",                 supplier: "MOE + Canyon REO",     available_count: 4,  sort_order: 11 },
    { slug: "pyranha-ripper-2-lg",   name: "Pyranha Ripper 2 Large",  manufacturer: "Pyranha",      model: "Ripper 2",       size: "Large",   category: "Half-Slice",   description: "Planing hull with sliced stern — Large fits ~85–110kg.",                                                supplier: "MOE + Canyon REO",     available_count: 4,  sort_order: 12 },
    { slug: "pyranha-firecracker-242", name: "Pyranha Firecracker 242", manufacturer: "Pyranha",    model: "Firecracker",    size: "242",     category: "Half-Slice",   description: "Compact half-slice; nimble and forgiving. 242 (medium) for ~55–80kg.",                                   supplier: "MOE",                  available_count: 2,  sort_order: 13 },
    { slug: "pyranha-firecracker-252", name: "Pyranha Firecracker 252", manufacturer: "Pyranha",    model: "Firecracker",    size: "252",     category: "Half-Slice",   description: "Compact half-slice. 252 (large) for ~75–100kg.",                                                         supplier: "MOE",                  available_count: 2,  sort_order: 14 },
    { slug: "dagger-rewind-sm",      name: "Dagger Rewind Small",     manufacturer: "Dagger",       model: "Rewind",         size: "Small",   category: "Half-Slice",   description: "Dagger's modern half-slice with sliced stern. Small for lighter paddlers.",                              supplier: "MOE",                  available_count: 2,  sort_order: 15 },
    { slug: "dagger-rewind-md",      name: "Dagger Rewind Medium",    manufacturer: "Dagger",       model: "Rewind",         size: "Medium",  category: "Half-Slice",   description: "Dagger's modern half-slice. Medium covers most paddlers.",                                               supplier: "MOE",                  available_count: 2,  sort_order: 16 },
    { slug: "dagger-rewind-lg",      name: "Dagger Rewind Large",     manufacturer: "Dagger",       model: "Rewind",         size: "Large",   category: "Half-Slice",   description: "Dagger's modern half-slice. Large for bigger paddlers.",                                                 supplier: "MOE",                  available_count: 2,  sort_order: 17 },
    { slug: "waka-goat",             name: "Waka Goat",               manufacturer: "Waka",         model: "Goat",           size: "",        category: "Half-Slice",   description: "Forgiving half-slice / river-runner with good edge control.",                                            supplier: "MOE",                  available_count: 2,  sort_order: 18 },
    { slug: "waka-steeze",           name: "Waka Steeze",             manufacturer: "Waka",         model: "Steeze",         size: "",        category: "Half-Slice",   description: "Playful half-slice with strong surf and freestyle pedigree.",                                            supplier: "MOE",                  available_count: 2,  sort_order: 19 },
    { slug: "ll-braaap-69",          name: "Liquid Logic Braaap 69",  manufacturer: "Liquid Logic", model: "Braaap",         size: "69",      category: "Half-Slice",   description: "Half-slice river runner — popular surf machine. 69 covers ~70–95kg.",                                    supplier: "MOE + Canyon REO",     available_count: 4,  sort_order: 20 },
    { slug: "ll-rmx-76",             name: "Liquid Logic Remix 76",   manufacturer: "Liquid Logic", model: "Remix",          size: "76",      category: "Half-Slice",   description: "Half-slice river-runner with comfortable cockpit. 76 for ~70–90kg.",                                     supplier: "Canyon REO",           available_count: 1,  sort_order: 21 },
    { slug: "ll-rmx-86",             name: "Liquid Logic Remix 86",   manufacturer: "Liquid Logic", model: "Remix",          size: "86",      category: "Half-Slice",   description: "Remix 86 fits larger paddlers ~85–110kg.",                                                                supplier: "Canyon REO",           available_count: 2,  sort_order: 22 },
    { slug: "ll-rmx-moe",            name: "Liquid Logic Remix",      manufacturer: "Liquid Logic", model: "Remix",          size: "Unknown", category: "Half-Slice",   description: "MOE stocks the Remix without specifying size — confirm size on pickup. Half-slice river-runner with comfortable cockpit.", supplier: "MOE",                  available_count: 2,  sort_order: 22 },
    { slug: "titan-rival",           name: "Titan Rival",             manufacturer: "Titan",        model: "Rival",          size: "",        category: "Half-Slice",   description: "British-built half-slice river-runner — sharper edges, surf-focused.",                                   supplier: "MOE",                  available_count: 2,  sort_order: 23 },
    { slug: "jackson-antix-2-md",    name: "Jackson Antix 2.0 Medium", manufacturer: "Jackson",     model: "Antix 2.0",      size: "Medium",  category: "Half-Slice",   description: "Jackson's latest half-slice — fast, edgy, slices stern on demand.",                                      supplier: "Ceiba",                available_count: 2,  sort_order: 24 },

    // ─── River Runner (Full Volume) ──────────────────────────────
    { slug: "dagger-axiom-8-0",      name: "Dagger Axiom 8.0",        manufacturer: "Dagger",       model: "Axiom",          size: "8.0",     category: "Half-Slice", description: "Friendly full-volume river-runner — predictable, fast, easy to roll. 8.0 for smaller paddlers.",        supplier: "MOE",                  available_count: 2,  sort_order: 30 },
    { slug: "dagger-axiom-8-5",      name: "Dagger Axiom 8.5",        manufacturer: "Dagger",       model: "Axiom",          size: "8.5",     category: "Half-Slice", description: "Full-volume river-runner. 8.5 mid-size.",                                                                supplier: "MOE",                  available_count: 2,  sort_order: 31 },
    { slug: "dagger-axiom-9-0",      name: "Dagger Axiom 9.0",        manufacturer: "Dagger",       model: "Axiom",          size: "9.0",     category: "Half-Slice", description: "Full-volume river-runner. 9.0 for larger paddlers.",                                                     supplier: "MOE",                  available_count: 2,  sort_order: 32 },
    { slug: "dagger-rpm",            name: "Dagger RPM",              manufacturer: "Dagger",       model: "RPM",            size: "",        category: "Half-Slice", description: "Classic '90s planing-hull river-runner — old-school feel, still rips.",                                  supplier: "MOE",                  available_count: 2,  sort_order: 33 },
    { slug: "ll-remix-59",           name: "Liquid Logic Remix 59",   manufacturer: "Liquid Logic", model: "Remix",          size: "59",      category: "Half-Slice", description: "Compact full-volume river-runner. 59 fits ~55–75kg.",                                                    supplier: "MOE",                  available_count: 2,  sort_order: 34 },
    { slug: "ll-remix-69",           name: "Liquid Logic Remix 69",   manufacturer: "Liquid Logic", model: "Remix",          size: "69",      category: "Half-Slice", description: "Workhorse full-volume river-runner. 69 fits ~70–90kg.",                                                  supplier: "MOE",                  available_count: 2,  sort_order: 35 },
    { slug: "ll-remix-79",           name: "Liquid Logic Remix 79",   manufacturer: "Liquid Logic", model: "Remix",          size: "79",      category: "Half-Slice", description: "Big-water Remix — workhorse Canyon boat. 79 fits ~85–110kg. Canyon REO has 3 older hulls, MOE multiple.",  supplier: "MOE + Canyon REO",     available_count: 5,  sort_order: 36 },
    { slug: "jackson-zen-65",        name: "Jackson Zen 65",          manufacturer: "Jackson",      model: "Zen",            size: "65",      category: "Half-Slice", description: "Older-gen Jackson Zen — planing-hull river-runner, fun and forgiving. (Pre-2018 stock from Ceiba.)",      supplier: "Ceiba",                available_count: 2,  sort_order: 37 },
    { slug: "jackson-zen-75",        name: "Jackson Zen 75",          manufacturer: "Jackson",      model: "Zen",            size: "75",      category: "Half-Slice", description: "Older-gen Jackson Zen 75 — bigger version, full-volume comfort. (Pre-2018 stock from Ceiba.)",            supplier: "Ceiba",                available_count: 2,  sort_order: 38 },
    { slug: "jackson-zen-3-md",      name: "Jackson Zen 3.0 Medium",  manufacturer: "Jackson",      model: "Zen 3.0",        size: "Medium",  category: "Half-Slice", description: "Latest-gen Jackson Zen — full-volume, comfortable cockpit.",                                              supplier: "Ceiba",                available_count: 2,  sort_order: 39 },
    { slug: "pyranha-scorch-x",      name: "Pyranha Scorch X",        manufacturer: "Pyranha",      model: "Scorch X",       size: "",        category: "Half-Slice", description: "Modern river-running creeker — fast, planted, big-water capable.",                                       supplier: "Canyon REO",           available_count: 2,  sort_order: 40 },

    // ─── Creek Boats ─────────────────────────────────────────────
    { slug: "dagger-mamba-7-6",      name: "Dagger Mamba 7.6",        manufacturer: "Dagger",       model: "Mamba",          size: "7.6",     category: "Creek",        description: "Classic creek/big-water hull. 7.6 for smaller paddlers.",                                                supplier: "Canyon REO",           available_count: 1,  sort_order: 50 },
    { slug: "dagger-mamba-8-1",      name: "Dagger Mamba 8.1",        manufacturer: "Dagger",       model: "Mamba",          size: "8.1",     category: "Creek",        description: "Mamba 8.1 — full-volume creeker, popular Grand Canyon workhorse.",                                       supplier: "MOE",                  available_count: 2,  sort_order: 51 },
    { slug: "ll-stomper-9-0",        name: "Liquid Logic Stomper 9.0", manufacturer: "Liquid Logic", model: "Stomper",       size: "9.0",     category: "Creek",        description: "Big-water creeker — punches through holes. (Canyon REO has 1 older hull.)",                              supplier: "Canyon REO",           available_count: 1,  sort_order: 52 },
    { slug: "jackson-karma-l",       name: "Jackson Karma L",         manufacturer: "Jackson",      model: "Karma",          size: "L",       category: "Creek",        description: "Classic creeker, full volume — orange Ceiba hull.",                                                       supplier: "Ceiba",                available_count: 2,  sort_order: 53 },

    // ─── Expedition / Self-Support ───────────────────────────────
    { slug: "ll-remix-xp-10",        name: "Liquid Logic Remix XP 10", manufacturer: "Liquid Logic", model: "Remix XP",      size: "10",      category: "Expedition",   description: "Self-support expedition kayak — carries 18 days of food/kit. Canyon REO has 2 (older hulls), Ceiba has at least 2. $450 surcharge incl. IR spray skirt.", supplier: "Ceiba + Canyon REO", available_count: 4,  sort_order: 60 },
    { slug: "ll-stinger-xp",         name: "Liquid Logic Stinger XP", manufacturer: "Liquid Logic", model: "Stinger XP",     size: "",        category: "Expedition",   description: "Faster, more knife-like self-support boat. Ceiba has 4 (orange, orange, green/blue, purple/blue), Canyon REO has 2 (BRAND NEW). $450 surcharge incl. IR spray skirt.", supplier: "Ceiba + Canyon REO", available_count: 6,  sort_order: 61 },
    { slug: "jackson-karma-trav-10", name: "Jackson Karma Traverse 10", manufacturer: "Jackson",    model: "Karma Traverse", size: "10",      category: "Expedition",   description: "Brand-new Jackson self-support fleet — Canyon REO has 8 (BRAND NEW), Ceiba has 2 (purple/blue and orange/red). Roomy storage, planted on big water. $450 surcharge incl. IR spray skirt.", supplier: "Ceiba + Canyon REO", available_count: 10, sort_order: 62 }
  ]

  for (const row of seed) {
    const rec = new Record(collection, row)
    app.save(rec)
  }
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_boats")
  return app.delete(collection)
})
