import { getDb } from '../db.js';

export function getAllLabs() {
  const db = getDb();
  const labsStmt = db.prepare('SELECT id, name FROM labs');
  const labs = labsStmt.all();

  const wsStmt = db.prepare('SELECT id, lab_id, name FROM workstations WHERE lab_id = ?');

  return labs.map((lab) => ({
    ...lab,
    workstations: wsStmt.all(lab.id),
  }));
}
