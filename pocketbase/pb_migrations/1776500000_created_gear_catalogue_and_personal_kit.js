/// <reference path="../pb_data/types.d.ts" />
// Personal gear: a catalogue seeded from the Ceiba outfitter invoice, and per-member kit lists.
//
// gear_catalogue holds the pickable menu. Items with included_in === "" are chargeable personal
// items members add to their own kit; items with a bundle code (full_rig / comp_kitchen /
// whole_shabang / toilet_system) are covered by the trip fee and shown read-only.
//
// personal_kit holds each member's chosen/bespoke items with a per-item expense the app totals.
migrate((app) => {
  // ---- gear_catalogue ----
  const catalogue = new Collection({
    "createRule": "",
    "deleteRule": "",
    "listRule": "",
    "viewRule": "",
    "updateRule": "",
    "id": "pbc_gear_catalogue",
    "name": "gear_catalogue",
    "system": false,
    "type": "base",
    "indexes": [],
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
      { "autogeneratePattern": "", "hidden": false, "id": "text_gc_name", "max": 0, "min": 0, "name": "name", "pattern": "", "presentable": true, "primaryKey": false, "required": true, "system": false, "type": "text" },
      { "autogeneratePattern": "", "hidden": false, "id": "text_gc_section", "max": 0, "min": 0, "name": "section", "pattern": "", "presentable": false, "primaryKey": false, "required": false, "system": false, "type": "text" },
      { "hidden": false, "id": "number_gc_price", "max": null, "min": null, "name": "unit_price", "onlyInt": false, "presentable": false, "required": false, "system": false, "type": "number" },
      { "autogeneratePattern": "", "hidden": false, "id": "text_gc_unit", "max": 0, "min": 0, "name": "unit_type", "pattern": "", "presentable": false, "primaryKey": false, "required": false, "system": false, "type": "text" },
      { "autogeneratePattern": "", "hidden": false, "id": "text_gc_included", "max": 0, "min": 0, "name": "included_in", "pattern": "", "presentable": false, "primaryKey": false, "required": false, "system": false, "type": "text" },
      { "hidden": false, "id": "bool_gc_nps", "name": "nps_required", "presentable": false, "required": false, "system": false, "type": "bool" },
      { "autogeneratePattern": "", "hidden": false, "id": "text_gc_notes", "max": 0, "min": 0, "name": "notes", "pattern": "", "presentable": false, "primaryKey": false, "required": false, "system": false, "type": "text" },
      { "hidden": false, "id": "number_gc_sort", "max": null, "min": null, "name": "sort", "onlyInt": true, "presentable": false, "required": false, "system": false, "type": "number" }
    ]
  })
  app.save(catalogue)

  // ---- personal_kit ----
  const personal = new Collection({
    "createRule": "",
    "deleteRule": "",
    "listRule": "",
    "viewRule": "",
    "updateRule": "",
    "id": "pbc_personal_kit",
    "name": "personal_kit",
    "system": false,
    "type": "base",
    "indexes": [],
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
      { "autogeneratePattern": "", "hidden": false, "id": "text_pk_member", "max": 0, "min": 0, "name": "member", "pattern": "", "presentable": false, "primaryKey": false, "required": true, "system": false, "type": "text" },
      { "autogeneratePattern": "", "hidden": false, "id": "text_pk_catitem", "max": 0, "min": 0, "name": "catalogue_item", "pattern": "", "presentable": false, "primaryKey": false, "required": false, "system": false, "type": "text" },
      { "autogeneratePattern": "", "hidden": false, "id": "text_pk_name", "max": 0, "min": 0, "name": "name", "pattern": "", "presentable": true, "primaryKey": false, "required": true, "system": false, "type": "text" },
      { "autogeneratePattern": "", "hidden": false, "id": "text_pk_section", "max": 0, "min": 0, "name": "section", "pattern": "", "presentable": false, "primaryKey": false, "required": false, "system": false, "type": "text" },
      { "hidden": false, "id": "number_pk_price", "max": null, "min": null, "name": "unit_price", "onlyInt": false, "presentable": false, "required": false, "system": false, "type": "number" },
      { "autogeneratePattern": "", "hidden": false, "id": "text_pk_unit", "max": 0, "min": 0, "name": "unit_type", "pattern": "", "presentable": false, "primaryKey": false, "required": false, "system": false, "type": "text" },
      { "hidden": false, "id": "number_pk_qty", "max": null, "min": null, "name": "qty", "onlyInt": false, "presentable": false, "required": false, "system": false, "type": "number" },
      { "hidden": false, "id": "number_pk_days", "max": null, "min": null, "name": "days", "onlyInt": false, "presentable": false, "required": false, "system": false, "type": "number" },
      { "autogeneratePattern": "", "hidden": false, "id": "text_pk_status", "max": 0, "min": 0, "name": "status", "pattern": "", "presentable": false, "primaryKey": false, "required": false, "system": false, "type": "text" },
      { "hidden": false, "id": "bool_pk_bespoke", "name": "is_bespoke", "presentable": false, "required": false, "system": false, "type": "bool" },
      { "autogeneratePattern": "", "hidden": false, "id": "text_pk_notes", "max": 0, "min": 0, "name": "notes", "pattern": "", "presentable": false, "primaryKey": false, "required": false, "system": false, "type": "text" }
    ]
  })
  app.save(personal)

  // ---- Seed gear_catalogue from the Ceiba Adventures invoice (WS Rattray, launch 9/25/27, 18 days) ----
  // unit_type: "day" = price per day (× trip days), "flat" = one-off fee, "each" = per unit.
  // included_in: "" = chargeable personal item; otherwise the trip-fee bundle it belongs to.
  let n = 0
  const seed = [
    // --- Whitewater Kayak (personal rental) ---
    { name: "WW Kayak (with floatbags)", section: "Whitewater Kayak", unit_price: 25, unit_type: "day", included_in: "" },
    { name: "Kayak paddle", section: "Whitewater Kayak", unit_price: 2, unit_type: "day", included_in: "" },
    { name: "Kayak helmet", section: "Whitewater Kayak", unit_price: 1.75, unit_type: "day", included_in: "", notes: "Inc w/ Kayak rental" },
    { name: "Kayak sprayskirt", section: "Whitewater Kayak", unit_price: 2.5, unit_type: "day", included_in: "" },
    { name: "PFD - Type III", section: "Whitewater Kayak", unit_price: 2.5, unit_type: "day", included_in: "" },

    // --- Stand-Up Paddle (personal rental) ---
    { name: "SUP Board", section: "Stand-Up Paddle", unit_price: 30, unit_type: "day", included_in: "" },
    { name: "SUP paddle (includes spare)", section: "Stand-Up Paddle", unit_price: 1.5, unit_type: "day", included_in: "", notes: "Inc w/ SUP" },
    { name: "SUP pump", section: "Stand-Up Paddle", unit_price: 1.5, unit_type: "day", included_in: "", notes: "Inc w/ SUP" },
    { name: "SUP repair kit", section: "Stand-Up Paddle", unit_price: 1.5, unit_type: "day", included_in: "", notes: "Inc w/ SUP" },

    // --- Camp & Personal Items (personal rental) ---
    { name: "Satellite phone", section: "Camp & Personal", unit_price: 13, unit_type: "day", included_in: "", notes: "$2/min additional cost" },
    { name: "InReach Satellite texting device", section: "Camp & Personal", unit_price: 9, unit_type: "day", included_in: "", notes: "$0.50/text sent & received" },
    { name: "Starlink Mini", section: "Camp & Personal", unit_price: 16, unit_type: "day", included_in: "", notes: "Up to 50GB; $2/GB overage" },
    { name: "Power station with solar panel - 100W", section: "Camp & Personal", unit_price: 12, unit_type: "day", included_in: "" },
    { name: "Solar panel - 21W", section: "Camp & Personal", unit_price: 2, unit_type: "day", included_in: "" },
    { name: "WaterPORT Portable Shower (3.8 gal)", section: "Camp & Personal", unit_price: 4.5, unit_type: "day", included_in: "" },
    { name: "Wood stove & fire blanket", section: "Camp & Personal", unit_price: 7, unit_type: "day", included_in: "" },
    { name: "Camp Chef Fire Pit", section: "Camp & Personal", unit_price: 4, unit_type: "day", included_in: "", notes: "Does not include propane" },
    { name: "Chair", section: "Camp & Personal", unit_price: 2, unit_type: "day", included_in: "" },
    { name: "Camp Shovel", section: "Camp & Personal", unit_price: 2, unit_type: "day", included_in: "" },
    { name: "Waterproof dry bag (65L or 110L)", section: "Camp & Personal", unit_price: 30, unit_type: "flat", included_in: "" },
    { name: "Waterproof DAY bag (35L)", section: "Camp & Personal", unit_price: 20, unit_type: "flat", included_in: "" },
    { name: "Guitar dry bag", section: "Camp & Personal", unit_price: 3.5, unit_type: "day", included_in: "" },
    { name: "Helmet", section: "Camp & Personal", unit_price: 1.75, unit_type: "day", included_in: "" },
    { name: "Paco pad", section: "Camp & Personal", unit_price: 3.5, unit_type: "day", included_in: "" },
    { name: "Camp Cot", section: "Camp & Personal", unit_price: 4.5, unit_type: "day", included_in: "" },
    { name: "Sand Mat", section: "Camp & Personal", unit_price: 2, unit_type: "day", included_in: "" },
    { name: "Sleep kit (dry bag, sheet, tarp, pillow, sleeping bag)", section: "Camp & Personal", unit_price: 6.5, unit_type: "day", included_in: "" },
    { name: "Tent (2-person)", section: "Camp & Personal", unit_price: 6.5, unit_type: "day", included_in: "" },
    { name: "Pyramid Boat Tent", section: "Camp & Personal", unit_price: 6.5, unit_type: "day", included_in: "" },

    // --- Retail Items (one-off purchase) ---
    { name: "The Guide to the Colorado River in the Grand Canyon (Martin & Whitis)", section: "Retail", unit_price: 40.95, unit_type: "each", included_in: "" },
    { name: "Larry Stevens Guide to the Colorado River in Grand Canyon", section: "Retail", unit_price: 34.95, unit_type: "each", included_in: "" },
    { name: "Colorado River Briefs", section: "Retail", unit_price: 24, unit_type: "each", included_in: "" },
    { name: "Grand Canyon River Hikes (Tyler Williams)", section: "Retail", unit_price: 29.95, unit_type: "each", included_in: "" },
    { name: "River to Rim (Nancy Brian)", section: "Retail", unit_price: 29.95, unit_type: "each", included_in: "" },
    { name: "River Journal", section: "Retail", unit_price: 16.95, unit_type: "each", included_in: "" },
    { name: "There's This River... Grand Canyon Boatman Stories (Christa Sadler)", section: "Retail", unit_price: 19.95, unit_type: "each", included_in: "" },
    { name: "Ceiba Beanie with leather patch", section: "Retail", unit_price: 20, unit_type: "each", included_in: "" },
    { name: "Ceiba Hoodie or Sunshirt", section: "Retail", unit_price: 30, unit_type: "each", included_in: "" },
    { name: "Ceiba Tie-Dyed Hoodie", section: "Retail", unit_price: 40, unit_type: "each", included_in: "" },
    { name: "Chums", section: "Retail", unit_price: 7, unit_type: "each", included_in: "" },
    { name: "Ceiba 16oz stainless steel tumbler", section: "Retail", unit_price: 15.95, unit_type: "each", included_in: "" },
    { name: "Ceiba 26oz Water Bottle", section: "Retail", unit_price: 25, unit_type: "each", included_in: "" },
    { name: "Flyco Fly Swatter", section: "Retail", unit_price: 13, unit_type: "each", included_in: "" },
    { name: "Ceiba Shopping Bag", section: "Retail", unit_price: 5, unit_type: "each", included_in: "" },
    { name: "Carabiner", section: "Retail", unit_price: 8.5, unit_type: "each", included_in: "" },

    // --- Included: Full Oar Rig (covered by trip fee) ---
    { name: "Aluminum main frame for boat, fully rigged w/ straps", section: "Full Rig", unit_price: 27, unit_type: "day", included_in: "full_rig" },
    { name: "Trailer frame w/ drop bag", section: "Full Rig", unit_price: 12, unit_type: "day", included_in: "full_rig" },
    { name: "Rear deck", section: "Full Rig", unit_price: 5, unit_type: "day", included_in: "full_rig" },
    { name: "11' Oar (with your choice of oar set up) - 18'", section: "Full Rig", unit_price: 10, unit_type: "day", included_in: "full_rig" },
    { name: "Rig Bag w/ 15 cam straps", section: "Full Rig", unit_price: 5, unit_type: "day", included_in: "full_rig" },
    { name: "Aluminum sand anchor & hammer", section: "Full Rig", unit_price: 1.5, unit_type: "day", included_in: "full_rig" },
    { name: "Throw bags", section: "Full Rig", unit_price: 1.5, unit_type: "day", included_in: "full_rig" },
    { name: "Drag bag", section: "Full Rig", unit_price: 1.5, unit_type: "day", included_in: "full_rig" },
    { name: "Throw cushion - type 4", section: "Full Rig", unit_price: 1.5, unit_type: "day", included_in: "full_rig", nps_required: true, notes: "NPS REQ 16' & longer" },
    { name: "Air pump/bag", section: "Full Rig", unit_price: 3, unit_type: "day", included_in: "full_rig" },
    { name: "Row Boat Repair kit", section: "Full Rig", unit_price: 5, unit_type: "day", included_in: "full_rig" },
    { name: "Bail buckets", section: "Full Rig", unit_price: 1.5, unit_type: "day", included_in: "full_rig" },
    { name: "205 qt. Canyon Cooler", section: "Full Rig", unit_price: 4.75, unit_type: "day", included_in: "full_rig" },
    { name: "Cooler covers", section: "Full Rig", unit_price: 2, unit_type: "day", included_in: "full_rig" },
    { name: "Aluminum Side Box & 20 mil covers", section: "Full Rig", unit_price: 1.5, unit_type: "day", included_in: "full_rig" },
    { name: "Aluminum table", section: "Full Rig", unit_price: 5.5, unit_type: "day", included_in: "full_rig" },

    // --- Included: Complete Kitchen (covered by trip fee) ---
    { name: "Stove w/ blaster, regulator, 1 full propane tank", section: "Complete Kitchen", unit_price: 9, unit_type: "day", included_in: "comp_kitchen" },
    { name: "Stove windscreen", section: "Complete Kitchen", unit_price: 1.5, unit_type: "flat", included_in: "comp_kitchen" },
    { name: "Griddle", section: "Complete Kitchen", unit_price: 1.5, unit_type: "day", included_in: "comp_kitchen" },
    { name: "Cook pots, silver bowls, Dutch ovens", section: "Complete Kitchen", unit_price: 3.5, unit_type: "day", included_in: "comp_kitchen" },
    { name: "Plates, bowls, silverware", section: "Complete Kitchen", unit_price: 2.5, unit_type: "day", included_in: "comp_kitchen" },
    { name: "Complete cooking utensils", section: "Complete Kitchen", unit_price: 2, unit_type: "day", included_in: "comp_kitchen" },
    { name: "Straining screen", section: "Complete Kitchen", unit_price: 1.5, unit_type: "day", included_in: "comp_kitchen", nps_required: true },
    { name: "Dish dryer net", section: "Complete Kitchen", unit_price: 1.5, unit_type: "day", included_in: "comp_kitchen" },
    { name: "Dish buckets (set of 4)", section: "Complete Kitchen", unit_price: 4.5, unit_type: "day", included_in: "comp_kitchen" },
    { name: "Kitchen ground tarp", section: "Complete Kitchen", unit_price: 2.5, unit_type: "day", included_in: "comp_kitchen", nps_required: true },
    { name: "Fire pan (NPS approved) w/ brush & shovel", section: "Complete Kitchen", unit_price: 3.5, unit_type: "day", included_in: "comp_kitchen" },
    { name: "Handwash system, 2 units in 1", section: "Complete Kitchen", unit_price: 3.5, unit_type: "day", included_in: "comp_kitchen", nps_required: true },

    // --- Included: Whole Shabang (covered by trip fee) ---
    { name: "1 Person Inflatable Kayak", section: "Whole Shabang", unit_price: 20, unit_type: "day", included_in: "whole_shabang" },
    { name: "Kayak paddle (includes spare)", section: "Whole Shabang", unit_price: 2, unit_type: "day", included_in: "whole_shabang" },
    { name: "Kayak helmet", section: "Whole Shabang", unit_price: 1.75, unit_type: "day", included_in: "whole_shabang" },
    { name: "Extra Rope - 60'", section: "Whole Shabang", unit_price: 1, unit_type: "day", included_in: "whole_shabang" },
    { name: "Ceiba 12 oz Insulated Mug", section: "Whole Shabang", unit_price: 5.5, unit_type: "flat", included_in: "whole_shabang" },
    { name: "2 gallon coffee Gott", section: "Whole Shabang", unit_price: 3, unit_type: "day", included_in: "whole_shabang" },
    { name: "Roll-a-table w/ ground tarp", section: "Whole Shabang", unit_price: 3.5, unit_type: "day", included_in: "whole_shabang" },
    { name: "Water jugs - 5 gallons", section: "Whole Shabang", unit_price: 1.5, unit_type: "day", included_in: "whole_shabang" },
    { name: "Rice bags - 1 dozen", section: "Whole Shabang", unit_price: 12, unit_type: "flat", included_in: "whole_shabang" },
    { name: "Kitchen parawing", section: "Whole Shabang", unit_price: 3.5, unit_type: "day", included_in: "whole_shabang" },
    { name: "Can smasher", section: "Whole Shabang", unit_price: 2, unit_type: "day", included_in: "whole_shabang" },
    { name: "PFDs - type 5 (life vests)", section: "Whole Shabang", unit_price: 2.5, unit_type: "day", included_in: "whole_shabang", nps_required: true, notes: "1 spare per 10 people" },
    { name: "50 cal personal ammo can", section: "Whole Shabang", unit_price: 1.5, unit_type: "day", included_in: "whole_shabang" },
    { name: "Camp Fun: Horseshoes & Bocci", section: "Whole Shabang", unit_price: 2.5, unit_type: "day", included_in: "whole_shabang" },
    { name: "Ceiba Hat - Dad, Trucker or Visor", section: "Whole Shabang", unit_price: 15, unit_type: "flat", included_in: "whole_shabang" },
    { name: "Trash dump & recycling fee", section: "Whole Shabang", unit_price: 100, unit_type: "flat", included_in: "whole_shabang" },

    // --- Included: Toilet System (covered by trip fee) ---
    { name: "Porto riser", section: "Toilet System", unit_price: 1.25, unit_type: "day", included_in: "toilet_system" },
    { name: "Pee bucket", section: "Toilet System", unit_price: 1.25, unit_type: "day", included_in: "toilet_system" }
  ]

  for (const row of seed) {
    n += 10
    const rec = new Record(catalogue, Object.assign({ sort: n, nps_required: false, notes: "" }, row))
    app.save(rec)
  }
}, (app) => {
  // Down migration — drop both collections.
  app.delete(app.findCollectionByNameOrId("pbc_personal_kit"))
  app.delete(app.findCollectionByNameOrId("pbc_gear_catalogue"))
})
