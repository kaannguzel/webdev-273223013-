# Instructions for the agent

Read this file at the start of every session. Keep it short and correct; update it when the project changes.

## Project

University Lab Booking is a web application for students to view available university lab workstations and book time slots, while lab staff manage labs, workstations and bookings. See `SPEC.md` for goals, non-goals and acceptance criteria.

## Commands

- Install: `npm install`
- Run: `npm start`
- Test: `npm test`
- Coverage: `npm run coverage`
- MCP server: `npm run --silent mcp`

## Conventions

Application code lives in `src/`. HTTP route handlers stay thin and pass work to service functions. Business rules, booking conflicts and authorization checks belong in the service layer, while database queries belong only in the data layer.

Use clear lower-case file names and descriptive function names. Client errors should be returned with an appropriate HTTP status code and a clear error message rather than exposing internal errors.

## Layers

Requests arrive two ways and both end in the same place:

- HTTP route handler → service → data access → database
- MCP tool → **the same service** → data access → database

A route handler reads the request and turns a result into a status code. A service holds the
rules and knows nothing about HTTP or about MCP. Only the data layer writes SQL. An MCP tool
that talks to the database directly is a second, unguarded way into your data: never add one.

## The model feature

- The provider is named in exactly one file: `src/services/model.js`
- The key comes from an environment variable and is never committed or logged.
- Every call has a timeout and a deterministic fallback, so the app still works when the provider is down or rate-limited.
- The model's output is re-checked against real data before anything is saved or shown.
- Tests never call the provider: they pass in a fake client.

## The MCP server

- Lives in `mcp-server/`, grew out of Exercise 1.
- Every tool calls a service function; none touches the data layer or the database directly.
- It carries a user, and enforces exactly the same authorization rules as the HTTP API.
- Adding a tool means adding a row to the table in `SPEC.md` too.

## Tests and coverage

- Every acceptance criterion in `SPEC.md` has an id like `AC-3`, and a test whose title contains that id.
- The coverage gate runs in CI: 100% of the service layer, 80% overall.
- A test is evidence. Changing a test so the code passes destroys the evidence.

## Always ask before

- deleting files or folders
- editing a migration that has already run
- installing or removing dependencies
- pushing, tagging or changing CI
- anything that touches secrets or `.env`
- changing an authentication or authorization rule
- adding, renaming or removing an MCP tool
- changing a coverage threshold
- sending user data to a third-party model

## Never

- commit secrets, passwords, API keys or an OAuth client secret
- weaken or delete a test to make it pass
- lower a coverage threshold or switch off a CI job to make the build green
- add an MCP tool that reaches past the service layer
- log a prompt that contains somebody's personal data