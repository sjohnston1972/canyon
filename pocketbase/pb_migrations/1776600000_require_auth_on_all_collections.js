/// <reference path="../pb_data/types.d.ts" />
// Every application collection was created with all five API rules set to ""
// (public / unauthenticated). That makes crew medical data, emergency
// contacts, and finances readable and writable by anyone on the internet.
// Lock every application collection down to authenticated crew accounts only.
//
// This does NOT touch the built-in "users" auth collection or any historical
// migration — it is a new migration layered on top.
migrate((app) => {
  const AUTH_RULE = "@request.auth.id != \"\""

  const collectionNames = [
    "team_members",
    "emergency_contacts",
    "extraction_points",
    "contingency_plans",
    "equipment",
    "finances",
    "finance_costs",
    "logistics_entries",
    "rafts",
    "rapid_media",
    "rapid_edits",
    "app_settings",
    "rafting_terms",
    "trauma_kits",
    "raft_types",
    "rigging_topics",
    "river_commands",
    "rafting_videos",
    "boats",
    "boat_choices",
    "gear_catalogue",
    "personal_kit",
  ]

  for (const name of collectionNames) {
    const collection = app.findCollectionByNameOrId(name)
    collection.listRule = AUTH_RULE
    collection.viewRule = AUTH_RULE
    collection.createRule = AUTH_RULE
    collection.updateRule = AUTH_RULE
    collection.deleteRule = AUTH_RULE
    app.save(collection)
  }
}, (app) => {
  const collectionNames = [
    "team_members",
    "emergency_contacts",
    "extraction_points",
    "contingency_plans",
    "equipment",
    "finances",
    "finance_costs",
    "logistics_entries",
    "rafts",
    "rapid_media",
    "rapid_edits",
    "app_settings",
    "rafting_terms",
    "trauma_kits",
    "raft_types",
    "rigging_topics",
    "river_commands",
    "rafting_videos",
    "boats",
    "boat_choices",
    "gear_catalogue",
    "personal_kit",
  ]

  for (const name of collectionNames) {
    const collection = app.findCollectionByNameOrId(name)
    collection.listRule = ""
    collection.viewRule = ""
    collection.createRule = ""
    collection.updateRule = ""
    collection.deleteRule = ""
    app.save(collection)
  }
})
