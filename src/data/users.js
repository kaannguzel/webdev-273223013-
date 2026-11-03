import { getDb } from '../db.js';

export function findUserByEmail(email) {
  const db = getDb();
  const stmt = db.prepare('SELECT id, email, password_hash, role FROM users WHERE email = ?');
  return stmt.get(email);
}

export function findUserById(id) {
  const db = getDb();
  const stmt = db.prepare('SELECT id, email, role FROM users WHERE id = ?');
  return stmt.get(id);
}
