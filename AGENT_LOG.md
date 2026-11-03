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