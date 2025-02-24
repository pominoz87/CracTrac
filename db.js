// db.js
const db = new Dexie("CrackInspectionDB");
db.version(1).stores({
  cracks: "++id, equipmentID, crackID, markerX, markerY, timestamp, severity, note, photoData, synced"
});
