import { getDb } from '../db.js';

export function createBooking({ workstation_id, user_id, start_time, end_time }) {
  const db = getDb();
  const stmt = db.prepare(
    'INSERT INTO bookings (workstation_id, user_id, start_time, end_time) VALUES (?, ?, ?, ?)'
  );
  const result = stmt.run(workstation_id, user_id, start_time, end_time);
  return {
    id: result.lastInsertRowid,
    workstation_id,
    user_id,
    start_time,
    end_time,
  };
}

export function getBookingById(id) {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM bookings WHERE id = ?');
  return stmt.get(id);
}

export function getBookingsByUser(user_id) {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM bookings WHERE user_id = ?');
  return stmt.all(user_id);
}

export function getBookingsForWorkstation(workstation_id) {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM bookings WHERE workstation_id = ?');
  return stmt.all(workstation_id);
}

export function deleteBooking(id) {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM bookings WHERE id = ?');
  stmt.run(id);
}
