import express from 'express';
import path from 'node:path';
import crypto from 'node:crypto';
import { initDb } from './db.js';
import { authenticateUser, getUserById } from './services/auth.js';
import { getLabsAndWorkstations } from './services/labs.js';
import { createBooking, cancelBooking, getUserBookings } from './services/bookings.js';

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
  const bookings = getUserBookings(req.user.id);

  let hasWorkstations = false;
  let workstationOptions = '';
  let workstationsHtml = '';

  for (const lab of labs) {
    workstationsHtml += `<li><strong>${lab.name}</strong><ul>`;
    for (const ws of lab.workstations) {
      hasWorkstations = true;
      workstationsHtml += `<li data-workstation-id="${ws.id}">${ws.name}</li>`;
      workstationOptions += `<option value="${ws.id}">${lab.name} - ${ws.name}</option>`;
    }
    workstationsHtml += `</ul></li>`;
  }

  let bookingsHtml = '';
  if (bookings.length === 0) {
    bookingsHtml = `<p id="noBookings">You have no bookings.</p>`;
  } else {
    bookingsHtml = `<ul id="bookingsList">`;
    for (const b of bookings) {
      bookingsHtml += `
        <li data-booking-id="${b.id}">
          Workstation ID: ${b.workstation_id} | Start: ${b.start_time} | End: ${b.end_time}
          <button onclick="cancelBooking(${b.id})" class="cancel-btn">Cancel</button>
        </li>
      `;
    }
    bookingsHtml += `</ul>`;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Available Workstations - University Lab Booking</title>
      <style>
        body { font-family: sans-serif; margin: 2rem; }
        .error { color: red; }
        .success { color: green; }
        .loading { font-style: italic; color: gray; }
      </style>
    </head>
    <body>
      <h1>Available Labs and Workstations</h1>
      <p>Signed in as: ${req.user.email}</p>

      <h2>Workstations</h2>
      ${hasWorkstations ? `<ul>${workstationsHtml}</ul>` : `<p id="noWorkstations">No workstations available.</p>`}

      <h2>Create Booking</h2>
      <form id="bookingForm">
        <div>
          <label>Workstation:
            <select id="workstationId" required>
              <option value="">-- Select Workstation --</option>
              ${workstationOptions}
            </select>
          </label>
        </div>
        <div>
          <label>Start Time: <input type="datetime-local" id="startTime" required /></label>
        </div>
        <div>
          <label>End Time: <input type="datetime-local" id="endTime" required /></label>
        </div>
        <button type="submit" id="submitBtn">Book Workstation</button>
      </form>
      <div id="loadingState" class="loading" style="display:none;">Submitting booking...</div>
      <div id="successMessage" class="success" style="display:none;"></div>
      <div id="errorMessage" class="error" style="display:none;"></div>

      <h2>My Bookings</h2>
      <div id="myBookingsContainer">
        ${bookingsHtml}
      </div>

      <script>
        document.getElementById('bookingForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const workstation_id = document.getElementById('workstationId').value;
          const start_time = document.getElementById('startTime').value;
          const end_time = document.getElementById('endTime').value;

          const submitBtn = document.getElementById('submitBtn');
          const loadingState = document.getElementById('loadingState');
          const successMessage = document.getElementById('successMessage');
          const errorMessage = document.getElementById('errorMessage');

          successMessage.style.display = 'none';
          errorMessage.style.display = 'none';
          loadingState.style.display = 'block';
          submitBtn.disabled = true;

          try {
            const res = await fetch('/bookings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ workstation_id, start_time, end_time })
            });

            const data = await res.json();

            if (res.status === 201) {
              successMessage.textContent = 'Booking created successfully!';
              successMessage.style.display = 'block';
              setTimeout(() => { window.location.reload(); }, 1000);
            } else if (res.status === 409) {
              errorMessage.textContent = 'Conflict (409): ' + (data.error || 'This time slot overlaps with an existing booking.');
              errorMessage.style.display = 'block';
            } else if (res.status === 422) {
              errorMessage.textContent = 'Validation Error (422): ' + (data.error || 'Invalid start or end time.');
              errorMessage.style.display = 'block';
            } else {
              errorMessage.textContent = 'Error: ' + (data.error || 'Failed to create booking.');
              errorMessage.style.display = 'block';
            }
          } catch (err) {
            errorMessage.textContent = 'Network or server error: ' + err.message;
            errorMessage.style.display = 'block';
          } finally {
            loadingState.style.display = 'none';
            submitBtn.disabled = false;
          }
        });

        async function cancelBooking(bookingId) {
          if (!confirm('Are you sure you want to cancel this booking?')) return;
          try {
            const res = await fetch('/bookings/' + bookingId, {
              method: 'DELETE'
            });
            if (res.status === 204) {
              window.location.reload();
            } else {
              const data = await res.json().catch(() => ({}));
              alert('Failed to cancel booking: ' + (data.error || res.statusText));
            }
          } catch (err) {
            alert('Error canceling booking: ' + err.message);
          }
        }
      </script>
    </body>
    </html>
  `;

  res.send(html);
});

// POST /bookings
app.post('/bookings', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { workstation_id, start_time, end_time } = req.body;
    const booking = createBooking({
      workstation_id,
      user_id: req.user.id,
      start_time,
      end_time,
    });
    return res.status(201).json(booking);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

// DELETE /bookings/:id
app.delete('/bookings/:id', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const bookingId = parseInt(req.params.id, 10);
    cancelBooking(bookingId, req.user);
    return res.status(204).send();
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
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
