/// <reference path="../pb_data/types.d.ts" />

// Initial schema migration for Canyon Expedition Planner
migrate((app) => {
  // --- Team Members ---
  const teamMembers = new Collection({
    name: 'team_members',
    type: 'base',
    schema: [
      { name: 'first_name', type: 'text', required: true },
      { name: 'last_name', type: 'text', required: true },
      { name: 'role', type: 'text' },
      { name: 'role_code', type: 'text' },
      { name: 'boat', type: 'text' },
      { name: 'boat_tag', type: 'text' },
      { name: 'medical_alert', type: 'text' },
      { name: 'status', type: 'select', options: { values: ['CLEARED', 'PENDING', 'FLAGGED'] } },
      { name: 'blood_type', type: 'text' },
      { name: 'certifications', type: 'text' },
      { name: 'critical_history', type: 'text' },
      { name: 'emergency_contact_name', type: 'text' },
      { name: 'emergency_contact_phone', type: 'text' },
      { name: 'emergency_contact_relation', type: 'text' },
    ],
  })
  app.save(teamMembers)

  // --- Waypoints ---
  const waypoints = new Collection({
    name: 'waypoints',
    type: 'base',
    schema: [
      { name: 'name', type: 'text', required: true },
      { name: 'river_mile', type: 'number', required: true },
      { name: 'lat', type: 'number', required: true },
      { name: 'lng', type: 'number', required: true },
      { name: 'difficulty', type: 'number' },
      { name: 'type', type: 'select', options: { values: ['rapid', 'camp', 'hazard', 'landmark', 'evacuation'] } },
      { name: 'risk_level', type: 'number' },
      { name: 'scout', type: 'text' },
      { name: 'primary_run', type: 'text' },
      { name: 'notes', type: 'editor' },
    ],
  })
  app.save(waypoints)

  // --- Waypoint Media ---
  const waypointMedia = new Collection({
    name: 'waypoint_media',
    type: 'base',
    schema: [
      { name: 'waypoint_id', type: 'relation', options: { collectionId: waypoints.id, maxSelect: 1 } },
      { name: 'media_type', type: 'select', options: { values: ['photo', 'video'] } },
      { name: 'file', type: 'file', options: { maxSelect: 1, maxSize: 524288000 } }, // 500MB for video
      { name: 'url', type: 'url' },
      { name: 'title', type: 'text' },
      { name: 'source', type: 'text' },
    ],
  })
  app.save(waypointMedia)

  // --- Equipment ---
  const equipment = new Collection({
    name: 'equipment',
    type: 'base',
    schema: [
      { name: 'name', type: 'text', required: true },
      { name: 'category', type: 'select', options: { values: ['kitchen', 'repair', 'comms', 'first_aid', 'personal', 'other'] } },
      { name: 'stowed_location', type: 'text' },
      { name: 'responsible', type: 'text' },
      { name: 'weight', type: 'text' },
      { name: 'status', type: 'select', options: { values: ['staged', 'priority', 'packed', 'on_river', 'consumed', 'lost'] } },
      { name: 'is_group_gear', type: 'bool' },
      { name: 'notes', type: 'text' },
      { name: 'qty', type: 'text' },
      { name: 'expiry', type: 'text' },
      { name: 'custodian', type: 'text' },
    ],
  })
  app.save(equipment)

  // --- Finances ---
  const finances = new Collection({
    name: 'finances',
    type: 'base',
    schema: [
      { name: 'description', type: 'text', required: true },
      { name: 'category', type: 'select', options: { values: ['permits', 'transport', 'food', 'gear', 'medical', 'comms', 'other'] } },
      { name: 'amount', type: 'number', required: true },
      { name: 'paid_by', type: 'text' },
      { name: 'date', type: 'text' },
      { name: 'split_type', type: 'select', options: { values: ['equal', 'custom'] } },
    ],
  })
  app.save(finances)

  // --- Logistics ---
  const logistics = new Collection({
    name: 'logistics',
    type: 'base',
    schema: [
      { name: 'entry_type', type: 'select', required: true, options: { values: ['shuttle', 'schedule', 'permit', 'comms'] } },
      { name: 'data', type: 'json', required: true },
    ],
  })
  app.save(logistics)

  // --- Emergency Contacts ---
  const emergencyContacts = new Collection({
    name: 'emergency_contacts',
    type: 'base',
    schema: [
      { name: 'name', type: 'text', required: true },
      { name: 'phone', type: 'text', required: true },
      { name: 'role', type: 'text' },
      { name: 'priority', type: 'bool' },
    ],
  })
  app.save(emergencyContacts)

  // --- Extraction Points ---
  const extractionPoints = new Collection({
    name: 'extraction_points',
    type: 'base',
    schema: [
      { name: 'mile', type: 'text', required: true },
      { name: 'name', type: 'text', required: true },
      { name: 'access', type: 'text' },
      { name: 'type', type: 'select', options: { values: ['PRIMARY', 'SECONDARY', 'EGRESS'] } },
    ],
  })
  app.save(extractionPoints)

  // --- Contingency Plans ---
  const contingencyPlans = new Collection({
    name: 'contingency_plans',
    type: 'base',
    schema: [
      { name: 'title', type: 'text', required: true },
      { name: 'icon', type: 'text' },
      { name: 'steps', type: 'json' }, // string array
    ],
  })
  app.save(contingencyPlans)

  // --- Raft Config ---
  const rafts = new Collection({
    name: 'rafts',
    type: 'base',
    schema: [
      { name: 'name', type: 'text', required: true },
      { name: 'tag', type: 'text' },
      { name: 'weight_kg', type: 'number' },
    ],
  })
  app.save(rafts)
}, (app) => {
  // Rollback
  const names = ['team_members', 'waypoints', 'waypoint_media', 'equipment', 'finances', 'logistics', 'emergency_contacts', 'extraction_points', 'contingency_plans', 'rafts']
  for (const name of names) {
    try { app.delete(app.findCollectionByNameOrId(name)) } catch {}
  }
})
