import ws from "k6/ws";
import { check, sleep } from "k6";

export const options = {
  vus: 20,
  duration: "1m",
  thresholds: {
    ws_connecting: ["p(95)<1000"],
    ws_msgs_received: ["count>0"],
  },
};

const WS_URL = __ENV.WS_URL || "ws://localhost:5001/ws";

export default function () {
  const url = `${WS_URL}?deviceId=test-${__VU}-${__ITER}`;

  const res = ws.connect(url, {}, function (socket) {
    socket.on("open", () => {
      socket.send(JSON.stringify({ type: "subscribe", deviceId: "bsc-1" }));
    });

    socket.on("message", (msg) => {
      try {
        const data = JSON.parse(msg as string);
        if (data.type === "telemetry") {
          check(data, {
            "has telemetry data": (d) => d.data && Array.isArray(d.data),
          });
        }
      } catch {
        // ignore parse errors in perf test
      }
    });

    socket.on("error", () => {
      // WebSocket errors are expected in load test
    });

    socket.setTimeout(() => {
      socket.close();
    }, 15000);
  });

  check(res, {
    "ws connection established": (r) => r && r.status === 101,
  });

  sleep(5);
}
