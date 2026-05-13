/// <reference path="../pb_data/types.d.ts" />
// Boat choices — one row per team member, capturing 1st / 2nd / 3rd boat picks.
// Relations stored as text IDs to match the project convention (see rapid_media.entry_id).
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
      { "autogeneratePattern": "", "hidden": false, "id": "text_bc_member",  "max": 0, "min": 0, "name": "team_member_id",  "pattern": "", "presentable": true,  "primaryKey": false, "required": true,  "system": false, "type": "text" },
      { "autogeneratePattern": "", "hidden": false, "id": "text_bc_first",   "max": 0, "min": 0, "name": "first_choice_id", "pattern": "", "presentable": false, "primaryKey": false, "required": false, "system": false, "type": "text" },
      { "autogeneratePattern": "", "hidden": false, "id": "text_bc_second",  "max": 0, "min": 0, "name": "second_choice_id","pattern": "", "presentable": false, "primaryKey": false, "required": false, "system": false, "type": "text" },
      { "autogeneratePattern": "", "hidden": false, "id": "text_bc_third",   "max": 0, "min": 0, "name": "third_choice_id", "pattern": "", "presentable": false, "primaryKey": false, "required": false, "system": false, "type": "text" },
      { "autogeneratePattern": "", "hidden": false, "id": "text_bc_notes",   "max": 0, "min": 0, "name": "notes",           "pattern": "", "presentable": false, "primaryKey": false, "required": false, "system": false, "type": "text" }
    ],
    "id": "pbc_boat_choices",
    "indexes": [
      "CREATE UNIQUE INDEX `idx_boat_choices_member` ON `boat_choices` (`team_member_id`)"
    ],
    "listRule": "",
    "name": "boat_choices",
    "system": false,
    "type": "base",
    "updateRule": "",
    "viewRule": ""
  })

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_boat_choices")
  return app.delete(collection)
})
