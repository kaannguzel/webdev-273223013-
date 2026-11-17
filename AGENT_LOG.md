# Agent log

One entry per agent session, newest at the bottom. Be honest: what went wrong is the useful part.

<!-- Copy this block for each session:

## YYYY-MM-DD · <short title>
- Goal:
- Delegated:
- Checkpoints:
- Went wrong:
- Changed by hand:

-->

## Exercise 1

- Used ChatGPT to understand the MCP protocol and the purpose of each step.
- Used ChatGPT to review errors in `server.js`, especially the `if / else if` structure and JSON-RPC error handling.
- Used Gemini CLI to connect to the MCP server and test real tool usage.
- Asked Gemini: `What does lecture 7 cover?`
- Gemini selected and called the `find_lecture` tool successfully.
- Ran a description experiment by changing the `find_lecture` description to `Returns course data.` and testing the same question again.

## 2026-11-03 · Build Slice 1

- Goal: build Slice 1 from `SPEC.md`: sign-in and the database-backed workstation list.
- Delegated: planning, database setup, local sign-in, protected `/workstations` route, seeded data, and tests for AC-9, AC-10 and AC-11.
- Checkpoints: reviewed the plan before build, verified the SQLite database contained real rows, signed in with the seeded account, deleted a workstation row and confirmed it disappeared after reload, and tested unauthenticated `/workstations` access with `curl`.
- Went wrong: the agent described the list as showing "available" workstations even though booking and time-slot availability logic is not part of Slice 1.
- Changed by hand: updated `SPEC.md` so Slice 1 is explicitly a database-backed workstation list only.

## 2026-11-17 · Exercise 3 plan

- Goal: build Slice 2, booking a workstation with conflict handling and cancellation.
- Autonomy: the agent may work only within one approved step at a time; I review the diff before every commit.
- Checkpoints: review the plan before any code, run `npm test` before every commit, inspect every staged diff, and require permission for everything listed under `Always ask before`.

### Final plan

1. Migration
   - Create `migrations/002_bookings.sql`.
   - Do not modify existing files in this step.

2. Service + rule tests
   - Create `src/data/bookings.js`.
   - Create `src/services/bookings.js`.
   - Reject past bookings.
   - Reject invalid time ranges.
   - Reject overlapping bookings.
   - Enforce ownership for cancellation.
   - Add tests for the relevant AC ids.

3. Endpoints + API tests
   - Add `POST /bookings`.
   - Add `DELETE /bookings/:id`.
   - Return 401, 409, 422 and 204 where appropriate.

4. Authorization
   - Unsigned users receive 401 in the HTTP/auth layer.
   - Signed-in non-owners receive 403 from the service layer.

5. UI
   - Add booking UI with loading, empty and readable error states.

Changed in review: the first plan tried to put the migration into `src/db.js`, so I changed it to a new numbered migration file. I also clarified that past bookings must be rejected, the UI must include loading/empty/error states, and 401 must stay separate from 403.