/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3980519374")

  // Add own_boat field — captures whether the paddler is bringing their own boat
  collection.fields.add(new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text_own_boat",
    "max": 0,
    "min": 0,
    "name": "own_boat",
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
  collection.fields.removeById("text_own_boat")
  return app.save(collection)
})
