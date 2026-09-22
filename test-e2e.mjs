import { spawn } from "node:child_process";
import readline from "node:readline";

const proc = spawn("node", ["dist/index.js"], {
  cwd: process.cwd(),
  stdio: ["pipe", "pipe", "inherit"],
});

const rl = readline.createInterface({
  input: proc.stdout,
  terminal: false,
});

let msgId = 1;
const pending = new Map();

rl.on("line", (line) => {
  if (!line.trim()) return;
  try {
    const data = JSON.parse(line);
    if (data.id && pending.has(data.id)) {
      const { resolve } = pending.get(data.id);
      pending.delete(data.id);
      resolve(data);
    }
  } catch (err) {
    console.error("Non-JSON stdout line:", line);
  }
});

function sendRequest(method, params = {}) {
  const id = msgId++;
  const payload = { jsonrpc: "2.0", id, method, params };
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    proc.stdin.write(JSON.stringify(payload) + "\n");
  });
}

function sendNotification(method, params = {}) {
  const payload = { jsonrpc: "2.0", method, params };
  proc.stdin.write(JSON.stringify(payload) + "\n");
}

async function runTests() {
  console.log("=== 1. Initializing MCP connection ===");
  const initRes = await sendRequest("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "e2e-tester", version: "1.0.0" },
  });
  console.log("Initialize Response:", initRes.result?.serverInfo);
  sendNotification("notifications/initialized");

  console.log("\n=== 2. Listing Tools ===");
  const toolsRes = await sendRequest("tools/list");
  const toolNames = toolsRes.result?.tools?.map((t) => t.name);
  console.log("Registered Tools:", toolNames);

  console.log("\n=== 3. Calling everything_health ===");
  const healthRes = await sendRequest("tools/call", {
    name: "everything_health",
    arguments: {},
  });
  console.log("Health Output:\n", healthRes.result?.content?.[0]?.text);

  console.log("\n=== 4. Calling everything_search (compact, exclude_noise: true, count: 5) ===");
  const searchRes1 = await sendRequest("tools/call", {
    name: "everything_search",
    arguments: {
      query: "*.json",
      path: process.cwd(),
      exclude_noise: true,
      format: "compact",
      count: 5,
    },
  });
  console.log("Search Output 1:\n", searchRes1.result?.content?.[0]?.text);

  console.log("\n=== 5. Calling everything_search (count: 120, testing count > 100 boundary) ===");
  const searchRes2 = await sendRequest("tools/call", {
    name: "everything_search",
    arguments: {
      query: "*.exe",
      count: 120,
    },
  });
  const outputText = searchRes2.result?.content?.[0]?.text || "";
  console.log("Search Output 2 length:", outputText.length);
  // print first 500 chars and total returned count
  const lines = outputText.split("\n");
  console.log(`Returned lines count: ${lines.length}`);
  console.log("Sample lines:\n" + lines.slice(0, 10).join("\n"));

  console.log("\n=== All Tests Completed Successfully ===");
  proc.kill();
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  proc.kill();
  process.exit(1);
});
