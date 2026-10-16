import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { APIRequestContext } from "@playwright/test";

/**
 * demo-field e2e paylaşımlı yardımcıları (test DEĞİL).
 * - `resolveDemoFieldId`: FIELD_ID env yoksa v2/dev/field/.env'den okur.
 * - `waitOperationTerminal`: execute 202 "running" dönerse run terminal duruma
 *   gelene kadar `/api/operations/runs` üzerinden bekler.
 */

export function resolveDemoFieldId(): string {
  if (process.env.FIELD_ID) return process.env.FIELD_ID;
  const candidates = [
    resolve(process.cwd(), "deployment/v2/dev/field/.env"),
    resolve(process.cwd(), "../deployment/v2/dev/field/.env"),
  ];
  for (const path of candidates) {
    try {
      const env = readFileSync(path, "utf-8");
      const line = env.split("\n").find((l) => l.startsWith("FIELD_ID="));
      if (line) return line.slice("FIELD_ID=".length).trim();
    } catch {
      // sonraki aday
    }
  }
  return "";
}

const TERMINAL = new Set(["completed", "rolled_back", "failed", "aborted", "cancelled"]);

export async function waitOperationTerminal(
  request: APIRequestContext,
  base: string,
  token: string,
  name: string,
  sinceMs: number,
  timeoutMs = 60_000,
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await request.get(`${base}/api/operations/runs`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (res.ok()) {
      const body = (await res.json()) as { runs?: Array<{ name: string; status: string; startedAt?: string }> };
      const match = (body.runs ?? [])
        .filter((r) => r.name === name)
        .filter((r) => (r.startedAt ? Date.parse(r.startedAt) >= sinceMs - 3000 : true))
        .sort((a, b) => (Date.parse(b.startedAt ?? "") || 0) - (Date.parse(a.startedAt ?? "") || 0))[0];
      if (match && TERMINAL.has(match.status)) return match.status;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  return "unknown";
}
