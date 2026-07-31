import { createServer } from "node:http";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const port = Number(process.env.IMRS_CODEX_BRIDGE_PORT || 43117);
const repoRoot = resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const inbox = join(repoRoot, "tmp", "codex-inbox");
const allowedOrigins = new Set([
  "https://imrs-omega.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000"
]);

mkdirSync(inbox, { recursive: true });

function sendJson(request, response, status, payload) {
  const origin = request.headers.origin;
  const allowOrigin = allowedOrigins.has(origin) ? origin : "https://imrs-omega.vercel.app";
  response.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Private-Network": "true",
    Vary: "Origin"
  });
  response.end(JSON.stringify(payload));
}

function safeFileName(value) {
  return String(value || "IMRS")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

const server = createServer((request, response) => {
  const origin = request.headers.origin;
  if (origin && !allowedOrigins.has(origin)) {
    sendJson(request, response, 403, { ok: false, error: "Origin not allowed." });
    return;
  }

  if (request.method === "OPTIONS") {
    sendJson(request, response, 200, { ok: true });
    return;
  }

  if (request.method === "GET" && request.url === "/health") {
    sendJson(request, response, 200, { ok: true, inbox });
    return;
  }

  if (request.method !== "POST" || request.url !== "/packet") {
    sendJson(request, response, 404, { ok: false, error: "Unknown route." });
    return;
  }

  let body = "";
  request.on("data", (chunk) => {
    body += chunk;
    if (body.length > 20_000_000) request.destroy();
  });

  request.on("end", () => {
    try {
      const payload = JSON.parse(body);
      const packet = payload.packet;
      if (!packet || packet.packetType !== "IMRS_CODEX_RESEARCH_PACKET") {
        sendJson(request, response, 400, { ok: false, error: "Invalid IMRS packet." });
        return;
      }

      const ticker = safeFileName(packet.companyProfile?.ticker || packet.companyProfile?.name || "IMRS");
      const date = new Date().toISOString().slice(0, 10);
      const fileName = `${ticker}-IMRS-Codex-Research-Packet-${date}.json`;
      const filePath = join(inbox, fileName);
      const latestPath = join(inbox, "latest-packet.json");
      const promptPath = join(inbox, "latest-prompt.txt");
      const text = `${JSON.stringify(packet, null, 2)}\n`;

      writeFileSync(filePath, text, "utf8");
      writeFileSync(latestPath, text, "utf8");
      writeFileSync(promptPath, `Use the staged packet at ${latestPath} and publish the final stock-only IMRS report.\n`, "utf8");

      sendJson(request, response, 200, {
        ok: true,
        filePath,
        latestPath,
        prompt: `Use the staged packet at ${latestPath} and publish the final stock-only IMRS report.`
      });
    } catch (error) {
      sendJson(request, response, 500, { ok: false, error: error instanceof Error ? error.message : "Could not stage packet." });
    }
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`IMRS Codex packet bridge running at http://127.0.0.1:${port}`);
  console.log(`Inbox: ${inbox}`);
  console.log("Leave this window open while using Export Rich Packet.");
});
