import { WebSocketServer } from "ws";
import { updateSystem, updatePihole, updateHA, setConnected } from "./store.js";

let agentSocket = null;
let heartbeatInterval = null;

export function setupWebSocket(server, wsSecretKey) {
  const wss = new WebSocketServer({ server, path: "/ws/agent" });

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const key = url.searchParams.get("key");

    if (key !== wsSecretKey) {
      ws.close(4001, "Unauthorized");
      console.log("[WS] Agent rejected: invalid key");
      return;
    }

    if (agentSocket) {
      agentSocket.close(4000, "Replaced by new connection");
    }

    agentSocket = ws;
    setConnected(true);
    console.log("[WS] Relay agent connected");

    if (heartbeatInterval) clearInterval(heartbeatInterval);
    heartbeatInterval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        ws.ping();
      }
    }, 15000);

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        switch (msg.type) {
          case "system":
            updateSystem(msg.data);
            break;
          case "pihole":
            updatePihole(msg.data);
            break;
          case "ha":
            updateHA(msg.data);
            break;
          case "command_result":
            break;
          default:
            break;
        }
      } catch (err) {
        console.error("[WS] Parse error:", err.message);
      }
    });

    ws.on("close", () => {
      console.log("[WS] Relay agent disconnected");
      agentSocket = null;
      setConnected(false);
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
    });

    ws.on("error", (err) => {
      console.error("[WS] Error:", err.message);
    });
  });

  return wss;
}

export function sendToAgent(command) {
  if (agentSocket && agentSocket.readyState === agentSocket.OPEN) {
    agentSocket.send(JSON.stringify(command));
    return true;
  }
  return false;
}
