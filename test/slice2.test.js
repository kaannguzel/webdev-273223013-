import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

// Use a separate test database
const testDbPath = path.join(process.cwd(), 'test-database-slice2.sqlite');
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}
process.env.DB_PATH = testDbPath;
process.env.NODE_ENV = 'test';

const { initDb, getDb } = await import('../src/db.js');
initDb();

// Apply migrations/002_bookings.sql explicitly in test setup without modifying src/db.js
const migrationPath = path.join(process.cwd(), 'migrations', '002_bookings.sql');
if (fs.existsSync(migrationPath)) {
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');
  getDb().exec(migrationSql);
}

const { createBooking, cancelBooking } = await import('../src/services/bookings.js');

describe('Slice 2: Booking Service Rules', () => {
  const workstationId = 1;
  const userId1 = 1;
  const userId2 = 2;

  // Insert a test user 2 in users table
  const db = getDb();
  db.prepare('INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)').run(
    userId2,
    'other@university.edu',
    'hash',
    'student'
  );

  it('AC-12 & service rule: start time must be in the future', () => {
    const pastStart = new Date(Date.now() - 3600000).toISOString();
    const futureEnd = new Date(Date.now() + 3600000).toISOString();

    assert.throws(
      () => {
        createBooking({
          workstation_id: workstationId,
          user_id: userId1,
          start_time: pastStart,
          end_time: futureEnd,
        });
      },
      (err) => err.status === 422
    );
  });

  it('AC-14 & service rule: end time must be after start time', () => {
    const futureStart = new Date(Date.now() + 3600000).toISOString();
    const futureEndBeforeStart = new Date(Date.now() + 1800000).toISOString();

    assert.throws(
      () => {
        createBooking({
          workstation_id: workstationId,
          user_id: userId1,
          start_time: futureStart,
          end_time: futureEndBeforeStart,
        });
      },
      (err) => err.status === 422
    );
  });

  it('AC-12: valid future booking is created successfully', () => {
    const start = new Date(Date.now() + 86400000).toISOString();
    const end = new Date(Date.now() + 90000000).toISOString();

    const booking = createBooking({
      workstation_id: workstationId,
      user_id: userId1,
      start_time: start,
      end_time: end,
    });

    assert.ok(booking.id);
    assert.strictEqual(booking.user_id, userId1);
  });

  it('AC-13 & service rule: overlapping booking for the same workstation is refused with 409', () => {
    const start = new Date(Date.now() + 172800000).toISOString();
    const end = new Date(Date.now() + 176400000).toISOString();

    // First booking
    const booking1 = createBooking({
      workstation_id: workstationId,
      user_id: userId1,
      start_time: start,
      end_time: end,
    });
    assert.ok(booking1.id);

    // Overlapping booking (same start/end or partial overlap)
    const overlapStart = new Date(new Date(start).getTime() + 1800000).toISOString();
    const overlapEnd = new Date(new Date(end).getTime() + 1800000).toISOString();

    assert.throws(
      () => {
        createBooking({
          workstation_id: workstationId,
          user_id: userId2,
          start_time: overlapStart,
          end_time: overlapEnd,
        });
      },
      (err) => err.status === 409
    );
  });

  it('AC-17 & service rule: cancellation must check ownership (403 if another student tries to cancel)', () => {
    const start = new Date(Date.now() + 259200000).toISOString();
    const end = new Date(Date.now() + 262800000).toISOString();

    const booking = createBooking({
      workstation_id: workstationId,
      user_id: userId1,
      start_time: start,
      end_time: end,
    });

    // Try to cancel as user 2 (not owner)
    assert.throws(
      () => {
        cancelBooking(booking.id, { id: userId2, email: 'other@university.edu' });
      },
      (err) => err.status === 403
    );

    // Cancel as owner (user 1) succeeds
    const success = cancelBooking(booking.id, { id: userId1, email: 'student@university.edu' });
    assert.strictEqual(success, true);
  });

  it('Cancel non-existent booking returns 404', () => {
    assert.throws(
      () => {
        cancelBooking(999999, { id: userId1, email: 'student@university.edu' });
      },
      (err) => err.status === 404
    );
  });
});
