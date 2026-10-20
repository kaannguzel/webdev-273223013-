# Usage

One row per agent session. In Gemini CLI, type `/stats` before you quit and copy the input and output tokens. Copilot shows credits instead of tokens: write those in the credits column. The free tier charges nothing, so record what the session **would cost at the provider's published list price**, and note once below the table which price list you used. Leave the cost empty for rows that only show credits.

| Date | Tool | Input tokens | Output tokens | Credits (if no tokens) | List-price cost |
|---|---|---|---|---|---|
| 2026-10-20 | Gemini CLI | 313 | 8 | | $0.000114 |

## Exercise 1

I used ChatGPT mainly as a tutor and reviewer while building the MCP server. I asked for explanations of MCP messages, help understanding errors, and guidance on where code blocks should go.

I used Gemini CLI to test the MCP server as a real agent client. Gemini discovered the available tools through MCP and successfully called `find_lecture` when I asked about lecture 7.

I wrote and edited the project files in the Codespace and used the self-check to verify the server behavior.