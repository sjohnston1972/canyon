/// <reference path="../pb_data/types.d.ts" />
// Conflicts (1st-pick demand exceeding supply) are derived, but their resolution state is not.
// Persist a per-boat resolved flag + note so the team can clear a conflict and record how.
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_boats")

  collection.fields.add(new Field({
    "hidden": false,
    "id": "bool_conflict_resolved",
    "name": "conflict_resolved",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  collection.fields.add(new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text_conflict_note",
    "max": 0,
    "min": 0,
    "name": "conflict_note",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_boats")
  collection.fields.removeById("bool_conflict_resolved")
  collection.fields.removeById("text_conflict_note")
  return app.save(collection)
})
