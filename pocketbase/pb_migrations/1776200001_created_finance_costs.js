/// <reference path="../pb_data/types.d.ts" />
// Budget plan — one row per planned line item.
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
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text_fc_name",
        "max": 0,
        "min": 0,
        "name": "name",
        "pattern": "",
        "presentable": true,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text_fc_category",
        "max": 0,
        "min": 0,
        "name": "category",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "number_fc_amount",
        "max": null,
        "min": null,
        "name": "amount",
        "onlyInt": false,
        "presentable": false,
        "required": true,
        "system": false,
        "type": "number"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text_fc_ccy",
        "max": 0,
        "min": 0,
        "name": "ccy",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "bool_fc_shared",
        "name": "shared",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "bool"
      },
      {
        "hidden": false,
        "id": "bool_fc_refundable",
        "name": "refundable",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "bool"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text_fc_due",
        "max": 0,
        "min": 0,
        "name": "due_code",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text_fc_notes",
        "max": 0,
        "min": 0,
        "name": "notes",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "number_fc_order",
        "max": null,
        "min": null,
        "name": "sort_order",
        "onlyInt": true,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      }
    ],
    "id": "pbc_finance_costs",
    "indexes": [],
    "listRule": "",
    "name": "finance_costs",
    "system": false,
    "type": "base",
    "updateRule": "",
    "viewRule": ""
  })

  app.save(collection)

  // Seed from the Excel cost estimate
  const seed = [
    { name: "US GOV ESTA (VISA)", category: "Travel", amount: 40, ccy: "USD", shared: false, refundable: false, due_code: "T-7", sort_order: 1 },
    { name: "Flights (core)", category: "Travel", amount: 1000, ccy: "USD", shared: false, refundable: false, due_code: "T-90", sort_order: 2 },
    { name: "Flights (extra luggage 15kg)", category: "Travel", amount: 200, ccy: "USD", shared: false, refundable: false, due_code: "T-90", sort_order: 3 },
    { name: "Flights (kayak)", category: "Travel", amount: 400, ccy: "USD", shared: false, refundable: false, due_code: "T-90", sort_order: 4 },
    { name: "Hotel (2x nights either end)", category: "Travel", amount: 500, ccy: "USD", shared: false, refundable: false, due_code: "T-7", sort_order: 5 },
    { name: "Transfer Vegas ↔ Flagstaff AZ", category: "Travel", amount: 200, ccy: "USD", shared: false, refundable: false, due_code: "T-7", sort_order: 6 },
    { name: "Insurance", category: "Travel", amount: 350, ccy: "USD", shared: false, refundable: false, due_code: "T-90", sort_order: 7 },
    { name: "NPS river permit — standard trip deposit", category: "NPS", amount: 400, ccy: "USD", shared: true, refundable: false, due_code: "IMMED", notes: "Deducted from final fees", sort_order: 8 },
    { name: "NPS river permit fee (Diamond Creek takeout)", category: "NPS", amount: 310, ccy: "USD", shared: false, refundable: false, due_code: "T-90", sort_order: 9 },
    { name: "GCNP standard entrance pass", category: "NPS", amount: 20, ccy: "USD", shared: false, refundable: false, due_code: "T-90", sort_order: 10 },
    { name: "GCNP non-US resident fee", category: "NPS", amount: 100, ccy: "USD", shared: false, refundable: false, sort_order: 11 },
    { name: "Outfitter", category: "Outfitter", amount: 2500, ccy: "USD", shared: false, refundable: false, due_code: "T-90", sort_order: 12 },
    { name: "Outfitter — damage deposit", category: "Outfitter", amount: 500, ccy: "USD", shared: true, refundable: true, due_code: "T-90", sort_order: 13 },
    { name: "Contingency / buffer (7.5%)", category: "Contingency", amount: 400, ccy: "USD", shared: false, refundable: false, notes: "Unexpected repairs, shuttle tips, weather diversions", sort_order: 14 },
  ]

  for (const row of seed) {
    const rec = new Record(collection, row)
    app.save(rec)
  }
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_finance_costs")
  return app.delete(collection)
})
