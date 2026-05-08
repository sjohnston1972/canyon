/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3980519374")

  // Add paddler_height field
  collection.fields.add(new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text_paddler_height",
    "max": 0,
    "min": 0,
    "name": "paddler_height",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // Add paddler_weight field
  collection.fields.add(new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text_paddler_weight",
    "max": 0,
    "min": 0,
    "name": "paddler_weight",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // Add boat_preference field
  collection.fields.add(new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text_boat_preference",
    "max": 0,
    "min": 0,
    "name": "boat_preference",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3980519374")

  // Remove the added fields on rollback
  collection.fields.removeById("text_paddler_height")
  collection.fields.removeById("text_paddler_weight")
  collection.fields.removeById("text_boat_preference")

  return app.save(collection)
})
