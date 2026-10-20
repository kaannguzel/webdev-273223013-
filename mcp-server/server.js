const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");

const rl = readline.createInterface({
  input: process.stdin,
  crlfDelay: Infinity,
});

rl.on("line", (line) => {
  if (!line.trim()) return;

  try {
    const message = JSON.parse(line);

    console.error("Received:", message);

    if (message.method === "initialize") {
      const response = {
        jsonrpc: "2.0",
        id: message.id,
        result: {
          protocolVersion: message.params.protocolVersion,
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: "webdev-course-mcp",
            version: "1.0.0",
          },
        },
      };

      process.stdout.write(JSON.stringify(response) + "\n");

    } else if (message.method === "notifications/initialized") {
      return;

    } else if (message.method === "tools/list") {
      const response = {
        jsonrpc: "2.0",
        id: message.id,
        result: {
          tools: [
            {
              name: "find_lecture",
              description:
                "Return the title and topics of a course lecture given its lecture number.",
              inputSchema: {
                type: "object",
                properties: {
                  number: {
                    type: "integer",
                    description: "Lecture number from 1 to 10",
                  },
                },
                required: ["number"],
              },
            },
            {
              name: "list_lectures",
              description:
                "Return a list of all course lectures with their numbers and titles.",
              inputSchema: {
                type: "object",
                properties: {},
              },
            },
          ],
        },
      };

      process.stdout.write(JSON.stringify(response) + "\n");

    } else if (message.method === "tools/call") {
      const toolName = message.params?.name;
      const args = message.params?.arguments;

      const lecturesPath = path.join(__dirname, "lectures.json");
      const lectures = JSON.parse(
        fs.readFileSync(lecturesPath, "utf8")
      );

      if (toolName === "find_lecture") {
        const lecture = lectures.find(
          (item) => item.number === args?.number
        );

        if (!lecture) {
          const response = {
            jsonrpc: "2.0",
            id: message.id,
            result: {
              content: [
                {
                  type: "text",
                  text: `Lecture ${args?.number} was not found.`,
                },
              ],
              isError: true,
            },
          };

          process.stdout.write(JSON.stringify(response) + "\n");
          return;
        }

        const response = {
          jsonrpc: "2.0",
          id: message.id,
          result: {
            content: [
              {
                type: "text",
                text: `Lecture ${lecture.number}: ${lecture.title}\nTopics: ${lecture.topics}`,
              },
            ],
            isError: false,
          },
        };

        process.stdout.write(JSON.stringify(response) + "\n");

      } else if (toolName === "list_lectures") {
        const lectureList = lectures
          .map((lecture) => `${lecture.number} - ${lecture.title}`)
          .join("\n");

        const response = {
          jsonrpc: "2.0",
          id: message.id,
          result: {
            content: [
              {
                type: "text",
                text: lectureList,
              },
            ],
            isError: false,
          },
        };

        process.stdout.write(JSON.stringify(response) + "\n");

      } else {
        const response = {
          jsonrpc: "2.0",
          id: message.id,
          error: {
            code: -32602,
            message: `Unknown tool: ${toolName}`,
          },
        };

        process.stdout.write(JSON.stringify(response) + "\n");
      }

    } else {
      const response = {
        jsonrpc: "2.0",
        id: message.id,
        error: {
          code: -32601,
          message: `Unknown method: ${message.method}`,
        },
      };

      process.stdout.write(JSON.stringify(response) + "\n");
    }

  } catch (error) {
    console.error("Invalid JSON:", error.message);
  }
});