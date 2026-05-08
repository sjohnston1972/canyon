/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": "",
    "deleteRule": "",
    "fields": [
      { "autogeneratePattern": "[a-z0-9]{15}", "hidden": false, "id": "text3208210256", "max": 15, "min": 15, "name": "id", "pattern": "^[a-z0-9]+$", "presentable": false, "primaryKey": true, "required": true, "system": true, "type": "text" },
      { "autogeneratePattern": "", "hidden": false, "id": "f_title", "max": 0, "min": 0, "name": "title", "pattern": "", "presentable": true, "primaryKey": false, "required": true, "system": false, "type": "text" },
      { "autogeneratePattern": "", "hidden": false, "id": "f_url", "max": 0, "min": 0, "name": "url", "pattern": "", "presentable": false, "primaryKey": false, "required": true, "system": false, "type": "text" },
      { "autogeneratePattern": "", "hidden": false, "id": "f_description", "max": 0, "min": 0, "name": "description", "pattern": "", "presentable": false, "primaryKey": false, "required": false, "system": false, "type": "text" }
    ],
    "id": "pbc_rafting_videos",
    "indexes": [],
    "listRule": "",
    "name": "rafting_videos",
    "system": false,
    "type": "base",
    "updateRule": "",
    "viewRule": ""
  });
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_rafting_videos");
  return app.delete(collection);
})
