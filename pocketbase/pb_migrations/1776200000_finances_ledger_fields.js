/// <reference path="../pb_data/types.d.ts" />
// Extend the finances collection so it functions as a proper ledger:
// direction (IN/OUT), ccy, fx_gbp, amount_gbp, note. Existing fields stay.
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4219755904")

  collection.fields.add(new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text_fin_direction",
    "max": 0,
    "min": 0,
    "name": "direction",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  collection.fields.add(new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text_fin_ccy",
    "max": 0,
    "min": 0,
    "name": "ccy",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  collection.fields.add(new Field({
    "hidden": false,
    "id": "number_fin_fx",
    "max": null,
    "min": null,
    "name": "fx_gbp",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  collection.fields.add(new Field({
    "hidden": false,
    "id": "number_fin_amt_gbp",
    "max": null,
    "min": null,
    "name": "amount_gbp",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  collection.fields.add(new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text_fin_note",
    "max": 0,
    "min": 0,
    "name": "note",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4219755904")
  collection.fields.removeById("text_fin_direction")
  collection.fields.removeById("text_fin_ccy")
  collection.fields.removeById("number_fin_fx")
  collection.fields.removeById("number_fin_amt_gbp")
  collection.fields.removeById("text_fin_note")
  return app.save(collection)
})
