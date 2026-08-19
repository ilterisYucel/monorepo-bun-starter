import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FetchLike } from "@gd-monorepo/plugin-sdk";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { EpiasTicketStore } from "./ticket-store";

function casResponse(status: number, body: string): Response {
  return {
    ok: status === 201,
    status,
    text: async () => body,
  } as Response;
}

const USER = "kullanici@firma.com.tr";
const CAS_URL = "https://cas.test/cas/v1/tickets";

describe("EpiasTicketStore", () => {
  let dir: string;
  let filePath: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "epias-ticket-"));
    filePath = join(dir, "tickets.json");
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("ilk istekte CAS'ten bilet alir ve dosyaya yazar", async () => {
    const fetchFn = vi.fn<FetchLike>(async () => casResponse(201, "TGT-ilk"));
    const store = new EpiasTicketStore({
      filePath,
      casUrl: CAS_URL,
      fetchFn,
    });

    const ticket = await store.ticket(USER, "parola");

    expect(ticket).toBe("TGT-ilk");
    expect(fetchFn).toHaveBeenCalledOnce();
  });

  it("gecerli bilet varken CAS'e tekrar istek atmaz (throttle korumasi)", async () => {
    const fetchFn = vi.fn<FetchLike>(async () => casResponse(201, "TGT-1"));
    const store = new EpiasTicketStore({
      filePath,
      casUrl: CAS_URL,
      ttlMs: 60_000,
      renewBeforeMs: 0,
      fetchFn,
    });

    const first = await store.ticket(USER, "parola");
    const second = await store.ticket(USER, "parola");

    expect(first).toBe("TGT-1");
    expect(second).toBe("TGT-1");
    expect(fetchFn).toHaveBeenCalledOnce();
  });

  it("omru dolan bilet yenilenir", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(casResponse(201, "TGT-eski"))
      .mockResolvedValueOnce(casResponse(201, "TGT-yeni"));
    const store = new EpiasTicketStore({
      filePath,
      casUrl: CAS_URL,
      ttlMs: 50,
      renewBeforeMs: 0,
      fetchFn,
    });

    expect(await store.ticket(USER, "parola")).toBe("TGT-eski");
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(await store.ticket(USER, "parola")).toBe("TGT-yeni");
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("bilet dosyada kalicidir — yeni store ornegi ayni bileti kullanir", async () => {
    const fetchFn = vi.fn<FetchLike>(async () => casResponse(201, "TGT-kalici"));
    const first = new EpiasTicketStore({
      filePath,
      casUrl: CAS_URL,
      ttlMs: 60_000,
      renewBeforeMs: 0,
      fetchFn,
    });
    await first.ticket(USER, "parola");

    const second = new EpiasTicketStore({
      filePath,
      casUrl: CAS_URL,
      ttlMs: 60_000,
      renewBeforeMs: 0,
      fetchFn,
    });
    expect(await second.ticket(USER, "parola")).toBe("TGT-kalici");
    expect(fetchFn).toHaveBeenCalledOnce();
  });

  it("es zamanli isteklerde tek CAS cagrisi yapilir", async () => {
    let callCount = 0;
    const fetchFn = vi.fn<FetchLike>(async () => {
      callCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 20));
      return casResponse(201, `TGT-${callCount}`);
    });
    const store = new EpiasTicketStore({
      filePath,
      casUrl: CAS_URL,
      ttlMs: 60_000,
      renewBeforeMs: 0,
      fetchFn,
    });

    const tickets = await Promise.all([
      store.ticket(USER, "parola"),
      store.ticket(USER, "parola"),
      store.ticket(USER, "parola"),
    ]);

    expect(new Set(tickets).size).toBe(1);
    expect(fetchFn).toHaveBeenCalledOnce();
  });

  it("invalidate sonrasi bilet yeniden alinir", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(casResponse(201, "TGT-1"))
      .mockResolvedValueOnce(casResponse(201, "TGT-2"));
    const store = new EpiasTicketStore({
      filePath,
      casUrl: CAS_URL,
      ttlMs: 60_000,
      renewBeforeMs: 0,
      fetchFn,
    });

    await store.ticket(USER, "parola");
    await store.invalidate(USER);
    expect(await store.ticket(USER, "parola")).toBe("TGT-2");
  });

  it("CAS 201 disinda cevap donerse hata firlatir", async () => {
    const fetchFn = vi.fn<FetchLike>(async () => casResponse(401, "yetkisiz"));
    const store = new EpiasTicketStore({
      filePath,
      casUrl: CAS_URL,
      fetchFn,
    });

    await expect(store.ticket(USER, "yanlis-parola")).rejects.toThrow(
      /HTTP 401/,
    );
  });
});
