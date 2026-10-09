// Faz-1 downsampled performans senaryosu (TELEMETRI-SORGU-PERFORMANS-MIMARISI UC-5/T-13).
//
// Gerçek tüketici davranışını taklit eder: ön yüz her zaman `names` filtresi gönderir
// (tek isim veya karşılaştırma için birkaç isim) + `deviceIds`. Filtresiz tam-tarama
// AYRI stres senaryosudur (SGTAM=1 ile açılır).
//
// Kullanım:
//   BASE_URL=http://localhost:5001 DEVICES=BSC-1,BSC-2 NAMES=SOC,SOH k6 run deployment/k6/downsampled.js

import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.BASE_URL || "http://localhost:5001";
const USER = __ENV.USER || "admin";
const PASS = __ENV.PASS || "admin123";
const DEVICES = __ENV.DEVICES || "BSC-1,BSC-2";
const NAMES = __ENV.NAMES || "BSC SOC,Rack SOC R1";
const STRESS = __ENV.SGTAM === "1";

export const options = {
  stages: [
    { duration: "20s", target: 10 },
    { duration: "40s", target: 30 },
    { duration: "20s", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<2000"],
    http_req_failed: ["rate<0.05"],
  },
};

export function setup() {
  const res = http.post(
    `${BASE}/api/auth/login`,
    JSON.stringify({ username: USER, password: PASS }),
    { headers: { "Content-Type": "application/json" } },
  );
  if (res.status !== 200) throw new Error(`login başarisiz: ${res.status}`);
  return { token: res.json("accessToken") };
}

function isoRange(minutesBack) {
  const to = new Date();
  const from = new Date(to.getTime() - minutesBack * 60_000);
  return { from: from.toISOString(), to: to.toISOString() };
}

export default function (data) {
  const headers = { Authorization: `Bearer ${data.token}` };
  const { from, to } = isoRange(60);
  const params = new URLSearchParams({
    deviceIds: DEVICES,
    from,
    to,
    points: "120",
  });
  if (!STRESS) params.append("names", NAMES);

  const res = http.get(`${BASE}/api/unified/telemetry/downsampled?${params.toString()}`, { headers });
  check(res, {
    "200 döner": (r) => r.status === 200,
    "telemetri dizisi": (r) => Array.isArray(r.json("telemetries")),
  });
  sleep(1);
}
