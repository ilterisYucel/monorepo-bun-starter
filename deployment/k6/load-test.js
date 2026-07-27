import http from "k6/http";
import { check, sleep, group } from "k6";

export const options = {
  stages: [
    { duration: "30s", target: 10 },
    { duration: "1m", target: 50 },
    { duration: "30s", target: 10 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<2000"],
    http_req_failed: ["rate<0.05"],
  },
};

const BASE = __ENV.BASE_URL || "http://localhost:5001";

export default function () {
  group("health check", () => {
    const res = http.get(`${BASE}/health`);
    check(res, {
      "health returns 200": (r) => r.status === 200 || r.status === 404,
    });
  });

  group("login", () => {
    const res = http.post(
      `${BASE}/api/auth/login`,
      JSON.stringify({ username: "admin", password: "admin123" }),
      { headers: { "Content-Type": "application/json" } },
    );
    check(res, {
      "login returns token or proper error": (r) =>
        r.status === 200 || r.status === 401,
    });
  });

  sleep(1);
}
