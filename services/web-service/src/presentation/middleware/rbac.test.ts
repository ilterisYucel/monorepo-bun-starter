import { describe, it, expect, vi } from "vitest";
import Fastify from "fastify";
import { createRbacHook } from "./rbac";
import type { ITokenService } from "../../domain/services/ITokenService";
import type { User, Role } from "@gd-monorepo/shared-types";

/**
 * rbac.ts KARAKTERİZASYONU (TESTING.md §8.2) — Faz 1 T1.4 değişikliğinden
 * ÖNCE mevcut davranışı sabitler (bug/delik dahil):
 * - PUBLIC_PREFIXES listesi JWT'siz geçer.
 * - ROUTE_PERMISSIONS: /api/auth/users→admin, /api/fields GET→tüm roller,
 *   /api/data/→tüm roller.
 * - T1.4: /api/commands yalnız admin/teknik.
 * - 2026-08-30 ROL GÜNCELLEMESİ: `developer` rolü eklendi (guest benzeri
 *   salt-okunur); guest/developer /api/fields GET + /api/data görür;
 *   komut/kullanıcı yönetimi KAPALI kalır.
 * - 2026-08-28: saha registry mutasyonları field stack'ten kaldırıldı —
 *   /api/fields POST/PUT/DELETE + /api/admin/fields izin satırları silindi;
 *   GET satırı /api/fields/* veri uçlarının korumasını taşımaya devam eder.
 */

function makeTokens(user: User | null, throws = false): ITokenService {
  return {
    signAccess: vi.fn(),
    signRefresh: vi.fn(),
    verifyAccess: vi.fn().mockImplementation(async () => {
      if (throws) throw new Error("invalid");
      return user;
    }),
    verifyRefresh: vi.fn(),
    signMfa: vi.fn(),
    verifyMfa: vi.fn(),
  };
}

function makeUser(role: Role, fieldIds?: string[]): User {
  return {
    id: "u-1",
    username: "u",
    role,
    name: "U",
    fieldIds,
    createdAt: "",
    updatedAt: "",
  };
}

async function buildApp(tokens: ITokenService) {
  const app = Fastify();
  app.addHook("onRequest", createRbacHook(tokens));
  app.get("/health", () => ({ status: "ok" }));
  app.get("/api/auth/users", () => ({ ok: true }));
  app.get("/api/fields", () => ({ ok: true }));
  app.post("/api/fields", () => ({ ok: true }));
  app.get("/api/data/x", () => ({ ok: true }));
  app.get("/api/unified/x", () => ({ ok: true }));
  app.post("/api/commands/execute", () => ({ ok: true }));
  return app;
}

describe("rbac karakterizasyon (mevcut davranış) @nis2-security", () => {
  it("PUBLIC_PREFIXES JWT'siz geçer", async () => {
    const app = await buildApp(makeTokens(null, true));
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
  });

  it("Bearer yoksa 401", async () => {
    const app = await buildApp(makeTokens(null));
    const res = await app.inject({ method: "GET", url: "/api/data/x" });
    expect(res.statusCode).toBe(401);
  });

  it("geçersiz token → 401", async () => {
    const app = await buildApp(makeTokens(null, true));
    const res = await app.inject({
      method: "GET",
      url: "/api/data/x",
      headers: { authorization: "Bearer bad" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("/api/auth/users yalnızca admin'e açık — teknik 403", async () => {
    const app = await buildApp(makeTokens(makeUser("teknik")));
    const res = await app.inject({
      method: "GET",
      url: "/api/auth/users",
      headers: { authorization: "Bearer t" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("/api/auth/users admin için açık", async () => {
    const app = await buildApp(makeTokens(makeUser("admin")));
    const res = await app.inject({
      method: "GET",
      url: "/api/auth/users",
      headers: { authorization: "Bearer t" },
    });
    expect(res.statusCode).toBe(200);
  });

  it("2026-08-30: /api/fields guest için AÇIK (saha dashboard salt-okunur)", async () => {
    const app = await buildApp(makeTokens(makeUser("guest")));
    const res = await app.inject({
      method: "GET",
      url: "/api/fields",
      headers: { authorization: "Bearer t" },
    });
    expect(res.statusCode).toBe(200);
  });

  it("2026-08-30: /api/fields developer için AÇIK", async () => {
    const app = await buildApp(makeTokens(makeUser("developer")));
    const res = await app.inject({
      method: "GET",
      url: "/api/fields",
      headers: { authorization: "Bearer t" },
    });
    expect(res.statusCode).toBe(200);
  });

  it("/api/fields boss için açık", async () => {
    const app = await buildApp(makeTokens(makeUser("boss")));
    const res = await app.inject({
      method: "GET",
      url: "/api/fields",
      headers: { authorization: "Bearer t" },
    });
    expect(res.statusCode).toBe(200);
  });

  it("/api/admin/fields izin satırı kaldırıldı (2026-08-28) — rbac serbest, uç yok (404)", async () => {
    const app = await buildApp(makeTokens(makeUser("teknik")));
    const res = await app.inject({
      method: "GET",
      url: "/api/admin/fields",
      headers: { authorization: "Bearer t" },
    });
    // Satır silindi; test app'te rota da yok — rbac katmanı 403 ÜRETMEZ.
    expect(res.statusCode).toBe(404);
  });

  it("/api/data/ beş role de açık (guest + developer dahil)", async () => {
    for (const role of ["admin", "teknik", "guest", "boss", "developer"] as Role[]) {
      const app = await buildApp(makeTokens(makeUser(role)));
      const res = await app.inject({
        method: "GET",
        url: "/api/data/x",
        headers: { authorization: "Bearer t" },
      });
      expect(res.statusCode).toBe(200);
    }
  });

  it("2026-08-30: developer /api/commands için KAPALI (403) — salt-okunur rol", async () => {
    const app = await buildApp(makeTokens(makeUser("developer")));
    const res = await app.inject({
      method: "POST",
      url: "/api/commands/execute",
      headers: { authorization: "Bearer t" },
      payload: {},
    });
    expect(res.statusCode).toBe(403);
  });

  it("2026-08-30: developer /api/auth/users için KAPALI (403)", async () => {
    const app = await buildApp(makeTokens(makeUser("developer")));
    const res = await app.inject({
      method: "GET",
      url: "/api/auth/users",
      headers: { authorization: "Bearer t" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("T1.4: /api/commands guest için KAPALI (403) — delik kapatıldı", async () => {
    const app = await buildApp(makeTokens(makeUser("guest")));
    const res = await app.inject({
      method: "POST",
      url: "/api/commands/execute",
      headers: { authorization: "Bearer t" },
      payload: {},
    });
    expect(res.statusCode).toBe(403);
  });

  it("T1.4: /api/commands teknik için AÇIK", async () => {
    const app = await buildApp(makeTokens(makeUser("teknik")));
    const res = await app.inject({
      method: "POST",
      url: "/api/commands/execute",
      headers: { authorization: "Bearer t" },
      payload: {},
    });
    expect(res.statusCode).toBe(200);
  });

  it("T1.4: /api/commands admin için AÇIK", async () => {
    const app = await buildApp(makeTokens(makeUser("admin")));
    const res = await app.inject({
      method: "POST",
      url: "/api/commands/execute",
      headers: { authorization: "Bearer t" },
      payload: {},
    });
    expect(res.statusCode).toBe(200);
  });

  it("2026-08-28: /api/fields mutasyon izin satırı kaldırıldı — rbac 403 ÜRETMEZ (uçlar kaldırıldı, gerçek sistemde 404)", async () => {
    for (const role of ["teknik", "admin"] as Role[]) {
      const app = await buildApp(makeTokens(makeUser(role)));
      const res = await app.inject({
        method: "POST",
        url: "/api/fields",
        headers: { authorization: "Bearer t" },
        payload: { name: "x" },
      });
      expect(res.statusCode).toBe(200);
    }
  });

  it("T1.4: /api/fields GET teknik için AÇIK (okuma korunur)", async () => {
    const app = await buildApp(makeTokens(makeUser("teknik")));
    const res = await app.inject({
      method: "GET",
      url: "/api/fields",
      headers: { authorization: "Bearer t" },
    });
    expect(res.statusCode).toBe(200);
  });

  it("izinsiz yol (tabloda yok) doğrulanmış kullanıcıya açıktır", async () => {
    const app = await buildApp(makeTokens(makeUser("guest")));
    const res = await app.inject({
      method: "GET",
      url: "/api/unified/x",
      headers: { authorization: "Bearer t" },
    });
    expect(res.statusCode).toBe(200);
  });
});

describe("rbac Faz 3 (oturum auth + tünel yolları)", () => {
  async function buildSessionApp(
    tokens: ITokenService,
    sessionUser: User | undefined,
  ) {
    const app = Fastify();
    app.addHook(
      "onRequest",
      createRbacHook(tokens, {
        sessionAuthenticator: async () => sessionUser,
      }),
    );
    app.get("/api/data/x", () => ({ ok: true }));
    app.post("/api/commands", () => ({ ok: true }));
    app.get("/containers/c-1/ui/", () => ({ ok: true }));
    return app;
  }

  it("geçerli container_session cookie'si Bearer'sız erişir", async () => {
    const app = await buildSessionApp(
      makeTokens(null),
      makeUser("guest"),
    );
    const res = await app.inject({
      method: "GET",
      url: "/api/data/x",
      headers: { cookie: "container_session=xyz; a=1" },
    });
    expect(res.statusCode).toBe(200);
  });

  it("geçersiz oturum cookie'si → 401 (fail-closed)", async () => {
    const app = await buildSessionApp(makeTokens(null), undefined);
    const res = await app.inject({
      method: "GET",
      url: "/api/data/x",
      headers: { cookie: "container_session=sahte" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("oturum kullanıcısına rol izinleri uygulanır (guest → komut 403)", async () => {
    const app = await buildSessionApp(makeTokens(null), makeUser("guest"));
    const res = await app.inject({
      method: "POST",
      url: "/api/commands",
      headers: { cookie: "container_session=xyz" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("oturum kullanıcısında mustChangePassword uygulanmaz", async () => {
    const user = { ...makeUser("boss"), mustChangePassword: true } as User;
    const app = await buildSessionApp(makeTokens(null), user);
    const res = await app.inject({
      method: "GET",
      url: "/api/data/x",
      headers: { cookie: "container_session=xyz" },
    });
    expect(res.statusCode).toBe(200);
  });

  it("2026-08-30: guest mustChangePassword enforcement'ından MUAFTIR (otomatik misafir girişi)", async () => {
    const user = { ...makeUser("guest"), mustChangePassword: true } as User;
    const app = await buildApp(makeTokens(user));
    const res = await app.inject({
      method: "GET",
      url: "/api/data/x",
      headers: { authorization: "Bearer t" },
    });
    expect(res.statusCode).toBe(200);
  });

  it("mustChangePassword olan teknik 403 alır (T1.6 korunur)", async () => {
    const user = { ...makeUser("teknik"), mustChangePassword: true } as User;
    const app = await buildApp(makeTokens(user));
    const res = await app.inject({
      method: "GET",
      url: "/api/data/x",
      headers: { authorization: "Bearer t" },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error).toBe("Sifre degisimi gerekli");
  });

  it("cookie yoksa Bearer akışı korunur", async () => {
    const app = await buildSessionApp(makeTokens(makeUser("guest")), undefined);
    const res = await app.inject({
      method: "GET",
      url: "/api/data/x",
      headers: { authorization: "Bearer t" },
    });
    expect(res.statusCode).toBe(200);
  });

  it("T3.3: /api/fields/ POST (session) teknik'e açık; 2026-08-30: guest/developer da AÇIK (birebir tünel eşlemesi)", async () => {
    const app = Fastify();
    app.addHook("onRequest", createRbacHook(makeTokens(makeUser("teknik"))));
    app.post("/api/fields/:fid/containers/:cid/session", () => ({ ok: true }));
    app.post("/api/fields", () => ({ ok: true }));
    const sessionRes = await app.inject({
      method: "POST",
      url: "/api/fields/f-1/containers/c-1/session",
      headers: { authorization: "Bearer t" },
    });
    expect(sessionRes.statusCode).toBe(200);

    const guestApp = Fastify();
    guestApp.addHook("onRequest", createRbacHook(makeTokens(makeUser("guest"))));
    guestApp.post("/api/fields/:fid/containers/:cid/session", () => ({ ok: true }));
    const guestRes = await guestApp.inject({
      method: "POST",
      url: "/api/fields/f-1/containers/c-1/session",
      headers: { authorization: "Bearer t" },
    });
    expect(guestRes.statusCode).toBe(200);

    const devApp = Fastify();
    devApp.addHook("onRequest", createRbacHook(makeTokens(makeUser("developer"))));
    devApp.post("/api/fields/:fid/containers/:cid/session", () => ({ ok: true }));
    const devRes = await devApp.inject({
      method: "POST",
      url: "/api/fields/f-1/containers/c-1/session",
      headers: { authorization: "Bearer t" },
    });
    expect(devRes.statusCode).toBe(200);

    // 2026-08-28: POST /api/fields mutasyon izin satırı kaldırıldı — gerçek
    // sistemde uç yok (404); rbac katmanı artık 403 ÜRETMEZ.
    const createRes = await app.inject({
      method: "POST",
      url: "/api/fields",
      headers: { authorization: "Bearer t" },
    });
    expect(createRes.statusCode).toBe(200);
  });

  it("tünel yolları PUBLIC'dir (cookie auth route katmanında)", async () => {
    const app = await buildSessionApp(makeTokens(null), undefined);
    const res = await app.inject({ method: "GET", url: "/containers/c-1/ui/" });
    expect(res.statusCode).toBe(200);
  });
});

describe("rbac Faz 6 T6.1 (MFA enrollment enforcement)", () => {
  function buildMfaApp(user: User, mfaRoles?: Role[]) {
    const app = Fastify();
    app.addHook(
      "onRequest",
      createRbacHook(makeTokens(user), undefined, mfaRoles ?? ["admin", "teknik"]),
    );
    app.get("/api/unified/x", () => ({ ok: true }));
    app.post("/api/auth/mfa/enroll", () => ({ ok: true }));
    app.post("/api/auth/mfa/confirm", () => ({ ok: true }));
    app.post("/api/auth/logout", () => ({ ok: true }));
    app.get("/api/auth/session", () => ({ ok: true }));
    return app;
  }

  const adminNoMfa = makeUser("admin");

  it("MFA kaydı olmayan admin veri uçlarına 403 alır (MFA kaydi gerekli)", async () => {
    const app = buildMfaApp(adminNoMfa);
    const res = await app.inject({
      method: "GET",
      url: "/api/unified/x",
      headers: { authorization: "Bearer t" },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error).toBe("MFA kaydi gerekli");
  });

  it("MFA allowlist yolları (enroll/confirm/logout/session) açık kalır", async () => {
    const app = buildMfaApp(adminNoMfa);
    for (const url of [
      "/api/auth/mfa/enroll",
      "/api/auth/mfa/confirm",
      "/api/auth/logout",
      "/api/auth/session",
    ]) {
      const res = await app.inject({
        method: url.startsWith("/api/auth/session") ? "GET" : "POST",
        url,
        headers: { authorization: "Bearer t" },
      });
      expect(res.statusCode).toBe(200);
    }
  });

  it("MFA kayıtlı admin (mfaEnabled=true) veri uçlarına girer", async () => {
    const app = buildMfaApp({ ...adminNoMfa, mfaEnabled: true });
    const res = await app.inject({
      method: "GET",
      url: "/api/unified/x",
      headers: { authorization: "Bearer t" },
    });
    expect(res.statusCode).toBe(200);
  });

  it("zorunlu liste dışındaki roller etkilenmez (boss/guest)", async () => {
    for (const role of ["boss", "guest"] as Role[]) {
      const app = buildMfaApp(makeUser(role));
      const res = await app.inject({
        method: "GET",
        url: "/api/unified/x",
        headers: { authorization: "Bearer t" },
      });
      expect(res.statusCode).toBe(200);
    }
  });

  it("mfaRequiredRoles boşsa enforcement KAPALI (container tier davranışı)", async () => {
    const app = buildMfaApp(adminNoMfa, []);
    const res = await app.inject({
      method: "GET",
      url: "/api/unified/x",
      headers: { authorization: "Bearer t" },
    });
    expect(res.statusCode).toBe(200);
  });
});

describe("rbac sınır durumları (2026-08-30 — T1.4)", () => {
  function buildMfaApp2(user: User, mfaRoles?: Role[]) {
    const app = Fastify();
    app.addHook(
      "onRequest",
      createRbacHook(makeTokens(user), undefined, mfaRoles ?? ["admin", "teknik"]),
    );
    app.get("/api/unified/x", () => ({ ok: true }));
    return app;
  }

  it("session kullanıcısında MFA enforcement UYGULANMAZ (pinleme — regresyon koruması)", async () => {
    const app = Fastify();
    app.addHook(
      "onRequest",
      createRbacHook(
        makeTokens(null),
        { sessionAuthenticator: async () => makeUser("admin") },
        ["admin", "teknik"],
      ),
    );
    app.get("/api/unified/x", () => ({ ok: true }));
    const res = await app.inject({
      method: "GET",
      url: "/api/unified/x",
      headers: { cookie: "container_session=xyz" },
    });
    // Tasarım: field tarafında zaten doğrulandı — konteyner tier'da MFA istenmez.
    expect(res.statusCode).toBe(200);
  });

  it("PUBLIC_PREFIX segment sınırı: benzer ama farklı yollar JWT'siz 401 döner", async () => {
    const app = await buildApp(makeTokens(null, true));
    for (const url of ["/healthz", "/api/auth/loginX", "/containersXYZ", "/ws/telemetry-x"]) {
      const res = await app.inject({ method: "GET", url });
      expect(`${url} → ${res.statusCode}`).toBe(`${url} → 401`);
    }
  });

  it("PUBLIC yollar query param'la da geçer (401 DEĞİL — rota yoksa 404)", async () => {
    const app = await buildApp(makeTokens(null, true));
    const res = await app.inject({
      method: "GET",
      url: "/api/auth/login?next=%2Fdashboard",
    });
    expect(res.statusCode).toBe(404);
  });

  it("mustChangePassword + MFA zorunluluğu birlikte: ÖNCE şifre değişimi 403 döner (öncelik pinleme)", async () => {
    const user = {
      ...makeUser("teknik"),
      mustChangePassword: true,
    } as User;
    const app = buildMfaApp2(user, ["admin", "teknik"]);
    const res = await app.inject({
      method: "GET",
      url: "/api/unified/x",
      headers: { authorization: "Bearer t" },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error).toBe("Sifre degisimi gerekli");
  });

  it("session yolu method eşleşmezse rbac serbesttir (uç yoksa 404 — pinleme)", async () => {
    const app = Fastify();
    app.addHook("onRequest", createRbacHook(makeTokens(makeUser("teknik"))));
    app.post("/api/fields/:fid/containers/:cid/session", () => ({ ok: true }));
    // GET, matristeki POST satırıyla eşleşmez → izin yok → serbest → 404 (rota yok)
    const res = await app.inject({
      method: "GET",
      url: "/api/fields/f-1/containers/c-1/session",
      headers: { authorization: "Bearer t" },
    });
    expect(res.statusCode).toBe(404);
  });

  it("developer MFA zorunlu listesinde değilse enforcement'dan etkilenmez", async () => {
    const app = buildMfaApp2(makeUser("developer"), ["admin", "teknik"]);
    const res = await app.inject({
      method: "GET",
      url: "/api/unified/x",
      headers: { authorization: "Bearer t" },
    });
    expect(res.statusCode).toBe(200);
  });
});
