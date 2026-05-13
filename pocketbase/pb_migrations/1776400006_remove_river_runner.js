/// <reference path="../pb_data/types.d.ts" />
// User: "remove river runner as a category". Migrate all River Runner boats
// into Half-Slice (the closest fit for modern river-runners). User can
// drag individual hulls to Creek via the /boats UI if they prefer.
migrate((app) => {
  const records = app.findRecordsByFilter("boats", "category = {:cat}", "", 0, 0, { cat: "River Runner" })
  for (const rec of records) {
    rec.set("category", "Half-Slice")
    app.save(rec)
  }
}, (app) => {
  // No clean rollback — once moved, the original categorisation is lost.
})
