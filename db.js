// db.js

const db = new Dexie("CrackInspectionDB");
db.version(1).stores({
  // Each record contains equipmentID, crackID, coordinates, an array "photos", and a sync flag.
  cracks: "++id, equipmentID, crackID, markerX, markerY, synced"
});
