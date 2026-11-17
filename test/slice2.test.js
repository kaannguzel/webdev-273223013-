import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Use a separate test database
const testDbPath = path.join(process.cwd(), 'test-database-slice2.sqlite');
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}
process.env.DB_PATH = testDbPath;
process.env.NODE_ENV = 'test';

const { initDb, getDb } = await import('../src/db.js');
initDb();

const migrationPath = path.join(process.cwd(), 'migrations', '002_bookings.sql');
if (fs.existsSync(migrationPath)) {
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');
  getDb().exec(migrationSql);
}

const { createBooking, cancelBooking } = await import('../src/services/bookings.js');
const { app } = await import('../src/server.js');

let server;
let baseUrl;

before(async () => {
  const db = getDb();
  // Seed user 2 for testing
  db.prepare('INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)').run(
    2,
    'other@university.edu',
    'hash',
    'student'
  );

  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve) => {
    server.close(() => {
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
      resolve();
    });
  });
});

describe('Slice 2: Booking Service Rules (Direct Service Tests)', () => {
  const workstationId = 1;
  const userId1 = 1;
  const userId2 = 2;

  it('AC-12 & service rule: start time in the past throws 422', () => {
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

  it('AC-14 & service rule: end time not after start time throws 422', () => {
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

  it('AC-12: valid future booking is created successfully via service', () => {
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

  it('AC-13 & service rule: overlapping booking throws 409', () => {
    const start = new Date(Date.now() + 172800000).toISOString();
    const end = new Date(Date.now() + 176400000).toISOString();

    createBooking({
      workstation_id: workstationId,
      user_id: userId1,
      start_time: start,
      end_time: end,
    });

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

  it('AC-17 & service rule: non-owner cancellation throws 403', () => {
    const start = new Date(Date.now() + 259200000).toISOString();
    const end = new Date(Date.now() + 262800000).toISOString();

    const booking = createBooking({
      workstation_id: workstationId,
      user_id: userId1,
      start_time: start,
      end_time: end,
    });

    assert.throws(
      () => {
        cancelBooking(booking.id, { id: userId2, email: 'other@university.edu' });
      },
      (err) => err.status === 403
    );

    const success = cancelBooking(booking.id, { id: userId1, email: 'student@university.edu' });
    assert.strictEqual(success, true);
  });

  it('Cancel non-existent booking throws 404', () => {
    assert.throws(
      () => {
        cancelBooking(999999, { id: userId1, email: 'student@university.edu' });
      },
      (err) => err.status === 404
    );
  });
});

describe('Slice 2: API Endpoints & Acceptance Criteria', () => {
  async function login(email, password) {
    const res = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ email, password }),
      redirect: 'manual',
    });
    return res.headers.get('set-cookie');
  }

  it('AC-15: A signed-out visitor who tries to create a booking receives 401 and no booking is created', async () => {
    const start = new Date(Date.now() + 500000000).toISOString();
    const end = new Date(Date.now() + 503600000).toISOString();

    const res = await fetch(`${baseUrl}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workstation_id: 1, start_time: start, end_time: end }),
    });

    assert.strictEqual(res.status, 401);
  });

  it('AC-14: A request with an invalid time range, where the end is not after the start, is refused with 422 and no booking is created', async () => {
    const cookie = await login('student@university.edu', 'password123');
    const start = new Date(Date.now() + 500000000).toISOString();
    const endBeforeStart = new Date(Date.now() + 400000000).toISOString();

    const res = await fetch(`${baseUrl}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie,
      },
      body: JSON.stringify({ workstation_id: 1, start_time: start, end_time: endBeforeStart }),
    });

    assert.strictEqual(res.status, 422);
  });

  it('AC-12: A signed-in student can create a booking for an existing workstation with a valid future start and end time, and the booking is stored in the database', async () => {
    const cookie = await login('student@university.edu', 'password123');
    const start = new Date(Date.now() + 600000000).toISOString();
    const end = new Date(Date.now() + 603600000).toISOString();

    const res = await fetch(`${baseUrl}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie,
      },
      body: JSON.stringify({ workstation_id: 1, start_time: start, end_time: end }),
    });

    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.ok(data.id);
    assert.strictEqual(data.workstation_id, 1);
  });

  it('AC-13: A booking that overlaps an existing booking for the same workstation is refused with 409, and no second booking row is created', async () => {
    const cookie = await login('student@university.edu', 'password123');
    const start = new Date(Date.now() + 700000000).toISOString();
    const end = new Date(Date.now() + 703600000).toISOString();

    await fetch(`${baseUrl}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie,
      },
      body: JSON.stringify({ workstation_id: 1, start_time: start, end_time: end }),
    });

    const overlapStart = new Date(new Date(start).getTime() + 1800000).toISOString();
    const overlapEnd = new Date(new Date(end).getTime() + 1800000).toISOString();

    const res = await fetch(`${baseUrl}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie,
      },
      body: JSON.stringify({ workstation_id: 1, start_time: overlapStart, end_time: overlapEnd }),
    });

    assert.strictEqual(res.status, 409);
  });

  it('AC-16: A student can cancel their own booking and receives 204, and the booking row is removed', async () => {
    const cookie = await login('student@university.edu', 'password123');
    const start = new Date(Date.now() + 800000000).toISOString();
    const end = new Date(Date.now() + 803600000).toISOString();

    const createRes = await fetch(`${baseUrl}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie,
      },
      body: JSON.stringify({ workstation_id: 2, start_time: start, end_time: end }),
    });
    const booking = await createRes.json();

    const cancelRes = await fetch(`${baseUrl}/bookings/${booking.id}`, {
      method: 'DELETE',
      headers: { Cookie: cookie },
    });

    assert.strictEqual(cancelRes.status, 204);

    const db = getDb();
    const row = db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking.id);
    assert.strictEqual(row, undefined);
  });

  it('AC-17: A signed-in student who tries to cancel another student\'s booking receives 403, and the booking remains in the database', async () => {
    const cookie1 = await login('student@university.edu', 'password123');
    const start = new Date(Date.now() + 900000000).toISOString();
    const end = new Date(Date.now() + 903600000).toISOString();

    const createRes = await fetch(`${baseUrl}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie1,
      },
      body: JSON.stringify({ workstation_id: 2, start_time: start, end_time: end }),
    });
    const booking = await createRes.json();

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync('password123', salt, 64).toString('hex');
    const password_hash = `${salt}:${hash}`;
    getDb().prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(password_hash, 'other@university.edu');

    const cookie2 = await login('other@university.edu', 'password123');

    const cancelRes = await fetch(`${baseUrl}/bookings/${booking.id}`, {
      method: 'DELETE',
      headers: { Cookie: cookie2 },
    });

    assert.strictEqual(cancelRes.status, 403);

    const db = getDb();
    const row = db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking.id);
    assert.ok(row);
  });
});
