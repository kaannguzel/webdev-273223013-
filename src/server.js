import express from 'express';
import path from 'node:path';
import crypto from 'node:crypto';
import { initDb } from './db.js';
import { authenticateUser, getUserById } from './services/auth.js';
import { getLabsAndWorkstations } from './services/labs.js';

initDb();

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Simple in-memory session store
const sessions = new Map();

// Middleware to parse cookies
app.use((req, res, next) => {
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const cookies = Object.fromEntries(
      cookieHeader.split('; ').map((c) => {
        const [key, ...v] = c.split('=');
        return [key, decodeURIComponent(v.join('='))];
      })
    );
    req.sessionId = cookies.sessionId;
    if (req.sessionId && sessions.has(req.sessionId)) {
      req.user = sessions.get(req.sessionId);
    }
  }
  next();
});

// GET /login
app.get('/login', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Sign In - University Lab Booking</title></head>
    <body>
      <h1>Sign In</h1>
      <form method="POST" action="/login">
        <div>
          <label>Email: <input type="email" name="email" required /></label>
        </div>
        <div>
          <label>Password: <input type="password" name="password" required /></label>
        </div>
        <button type="submit">Sign In</button>
      </form>
    </body>
    </html>
  `);
});

// POST /login
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = authenticateUser(email, password);

  if (!user) {
    return res.status(401).send(`
      <!DOCTYPE html>
      <html>
      <head><title>Sign In Failed</title></head>
      <body>
        <h1>Sign In Failed</h1>
        <p>Invalid email or password.</p>
        <a href="/login">Try Again</a>
      </body>
      </html>
    `);
  }

  const sessionId = crypto.randomBytes(32).toString('hex');
  sessions.set(sessionId, user);

  res.setHeader('Set-Cookie', `sessionId=${sessionId}; Path=/; HttpOnly`);
  res.redirect('/workstations');
});

// GET /workstations (AC-9: redirect to login if not signed in)
app.get('/workstations', (req, res) => {
  if (!req.user) {
    return res.redirect('/login');
  }

  const labs = getLabsAndWorkstations();

  let html = `
    <!DOCTYPE html>
    <html>
    <head><title>Available Workstations - University Lab Booking</title></head>
    <body>
      <h1>Available Labs and Workstations</h1>
      <p>Signed in as: ${req.user.email}</p>
      <ul>
  `;

  for (const lab of labs) {
    html += `<li><strong>${lab.name}</strong><ul>`;
    for (const ws of lab.workstations) {
      html += `<li data-workstation-id="${ws.id}">${ws.name}</li>`;
    }
    html += `</ul></li>`;
  }

  html += `
      </ul>
    </body>
    </html>
  `;

  res.send(html);
});

// Root redirect
app.get('/', (req, res) => {
  res.redirect('/workstations');
});

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

export { app, sessions };
