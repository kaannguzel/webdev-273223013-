# University Lab Booking

<!-- Exercise 2. Write the non-goals first. Every acceptance criterion must be checkable in under a minute.
     Keep these headings exactly as they are: the self-checks look for them by name.
     The full target is on the course site under Resources → The course project. -->

## Project option

Lab booking.

## Goals

- A student can sign in, see available lab workstations for a selected day, and book an available time slot.
- Lab staff can manage labs and workstations and view all current bookings.

## Non-goals

- No online payments for lab bookings.
- No email or push notifications.
- No native mobile application; the project will use a responsive web interface.

## Constraints

- The backend will use Node.js with Express and a relational database.
- Passwords are never stored as readable text; they are stored only as secure hashes.

## The model feature

- Model: Gemini 2.5 Flash, used to suggest suitable workstation booking times based on the student's request.
- Input: The student's preferred day, time range, and requested lab or workstation requirements.
- Output: A suggested booking time and workstation option for the student to review before booking.
- When it fails: If the model is unavailable, slow, rate-limited, or returns an invalid suggestion, the user sees a message and can continue by choosing an available workstation manually.

## Auth

- Local: Students and lab staff can sign in with e-mail and password, with passwords stored only as secure hashes.
- Provider: Sign in with Google using the server-side authorization flow.
- Linking: If a verified Google account uses the same e-mail address as an existing local account, both sign-in methods lead to the same user account instead of creating a duplicate.

## MCP tools

| Tool | What it does | Who may call it |
| --- | --- | --- |
| `available_workstations` | Lists workstations that are available for a selected day and time range. | signed-in users |
| `my_bookings` | Lists the current bookings belonging to the signed-in student. | the signed-in student |
| `book_workstation` | Creates a booking for an available workstation and refuses conflicting bookings. | the signed-in student |


## UI

Node.js with Express for the backend and plain HTML, CSS and JavaScript for the frontend. The main screens are the sign-in page, the available workstations list, the student's bookings page, and a staff management page.

## Architecture

<!-- Exercise 3. One request traced through every layer, naming the file for each one,
     plus one place where your own code does not match this layering. -->

## Acceptance criteria

<!-- Every criterion carries an id. A test proves it by naming that id in its title, for example
     test('AC-3 a booking that overlaps another is refused with 409', ...).
     Say who acts, what they see, and what must be true in the database. -->

- [AC-1] A signed-in student who opens the labs page sees the available labs and workstations.
- [AC-2] A student who selects a day sees the workstations available for that day.
- [AC-3] A student who books an available workstation sees a confirmation, and a new booking row appears in the database.
- [AC-4] A student who tries to book an occupied time slot sees an error, and no duplicate booking row is created.
- [AC-5] A student who cancels their own booking sees the booking removed from their booking list.
- [AC-6] A student cannot cancel another student's booking.
- [AC-7] Lab staff can add a new lab or workstation, and the new item appears in the relevant list.
- [AC-8] Lab staff can view all bookings, while a student sees only their own bookings.

### Slice 1: sign-in and the database-backed workstation list

- [AC-9] A visitor who opens the workstations list without signing in is redirected to the sign-in page.
- [AC-10] After signing in with a seeded student account, the workstations list shows the seeded workstation rows from the database.
- [AC-11] Deleting one workstation row from the database and reloading the page removes that workstation from the list.

## Traceability

<!-- Filled in from Exercise 3 onward: each AC id, and the test that names it. -->

| Criterion | Test |
| --- | --- |
| AC-9 | AC-9: A visitor who opens the workstations list without signing in is redirected to the sign-in page |
| AC-10 | AC-10: After signing in with a seeded student account, the workstations list shows the seeded workstation rows from the database |
| AC-11 | AC-11: Deleting one workstation row from the database and reloading the page removes that workstation from the list |

## Spec vs result

- Passed: AC-9, AC-10 and AC-11 passed. An unauthenticated visitor is redirected to `/login`, a signed-in seeded student sees workstation rows from the SQLite database, and deleting a workstation row from the database removes it from the page after reload.
- Missed or reinterpreted: the agent described the screen as showing "available" workstations, but Slice 1 does not yet implement booking or time-slot availability logic.
- Changed: Slice 1 is now explicitly defined as a database-backed workstation list only; booking and time-slot availability logic are outside this slice.