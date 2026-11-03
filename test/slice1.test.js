import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

// Use a separate test database
const testDbPath = path.join(process.cwd(), 'test-database.sqlite');
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}
process.env.DB_PATH = testDbPath;
process.env.NODE_ENV = 'test';

const { app } = await import('../src/server.js');
const { getDb } = await import('../src/db.js');
const { authenticateUser, getUserById } = await import('../src/services/auth.js');

let server;
let baseUrl;

before(async () => {
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

describe('Slice 1: Sign-in and Workstations List', () => {
  it('AC-9: A visitor who opens the workstations list without signing in is redirected to the sign-in page', async () => {
    const res = await fetch(`${baseUrl}/workstations`, {
      redirect: 'manual',
    });
    assert.strictEqual(res.status, 302);
    assert.strictEqual(res.headers.get('location'), '/login');
  });

  it('AC-10: After signing in with a seeded student account, the workstations list shows the seeded workstation rows from the database', async () => {
    // 1. Post to login
    const loginRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        email: 'student@university.edu',
        password: 'password123',
      }),
      redirect: 'manual',
    });

    assert.strictEqual(loginRes.status, 302);
    const setCookie = loginRes.headers.get('set-cookie');
    assert.ok(setCookie);

    // 2. Fetch workstations with session cookie
    const wsRes = await fetch(`${baseUrl}/workstations`, {
      headers: { Cookie: setCookie },
    });
    assert.strictEqual(wsRes.status, 200);
    const html = await wsRes.text();

    assert.ok(html.includes('Workstation 1'));
    assert.ok(html.includes('Workstation 2'));
  });

  it('AC-11: Deleting one workstation row from the database and reloading the page removes that workstation from the list', async () => {
    // 1. Sign in to get cookie
    const loginRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        email: 'student@university.edu',
        password: 'password123',
      }),
      redirect: 'manual',
    });
    const setCookie = loginRes.headers.get('set-cookie');

    // 2. Delete one workstation from database
    const db = getDb();
    db.prepare('DELETE FROM workstations WHERE name = ?').run('Workstation 2');

    // 3. Fetch workstations again
    const wsRes = await fetch(`${baseUrl}/workstations`, {
      headers: { Cookie: setCookie },
    });
    assert.strictEqual(wsRes.status, 200);
    const html = await wsRes.text();

    assert.ok(html.includes('Workstation 1'));
    assert.strictEqual(html.includes('Workstation 2'), false);
  });

  it('Authentication and user lookup edge cases for 100% service coverage', () => {
    // Non-existent email
    const noUser = authenticateUser('nonexistent@university.edu', 'password123');
    assert.strictEqual(noUser, null);

    // Wrong password
    const wrongPass = authenticateUser('student@university.edu', 'wrongpassword');
    assert.strictEqual(wrongPass, null);

    // getUserById
    const user = getUserById(1);
    assert.ok(user);
    assert.strictEqual(user.email, 'student@university.edu');

    // Invalid login via HTTP endpoint
    // We can also test POST /login with bad credentials
  });
});
