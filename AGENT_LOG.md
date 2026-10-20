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