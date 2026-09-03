import type { FastifyRequest, FastifyReply } from "fastify";
import type { Role, User } from "@gd-monorepo/shared-types";
import type { ITokenService } from "../../domain/services/ITokenService";

/** Route izin girdisi — method-aware (Faz 1 T1.4). "*" = tüm metodlar. */
interface RoutePermission {
  path: string;
  methods: string[];
  roles: Role[];
}

const ROUTE_PERMISSIONS: RoutePermission[] = [
  { path: "/api/auth/users", methods: ["*"], roles: ["admin"] },
  // T1.4: komut çalıştırma admin/teknik ile sınırlandı (önceden korumasızdı)
  { path: "/api/commands", methods: ["*"], roles: ["admin", "teknik"] },
  // Faz 3 T3.3: oturum açma (POST /:fid/containers/:cid/session) — 2026-08-30
  // birebir tünel eşlemesi: TÜM roller oturum açabilir (guest/developer dahil);
  // kayıt (register) route'u kendi içinde admin/boss kontrolü yapar (T1.2)
  { path: "/api/fields/", methods: ["POST"], roles: ["admin", "teknik", "boss", "guest", "developer"] },
  // 2026-08-28: saha registry mutasyonları field stack'ten kaldırıldı (tek saha
  // modeli — FIELD_ID env + açılış seed'i); çok saha yönetimi boss uygulamasına
  // taşınacak. GET satırı KALIR: /api/fields/* veri uçlarının (summary,
  // containers, telemetry) rol korumasını prefix eşleşmesiyle o sağlar.
  // 2026-08-30: guest/developer saha verisini SALT-OKUNUR görür (dashboard).
  { path: "/api/fields", methods: ["GET"], roles: ["admin", "teknik", "boss", "guest", "developer"] },
  { path: "/api/data/", methods: ["*"], roles: ["admin", "teknik", "guest", "boss", "developer"] },
];

const PUBLIC_PREFIXES = [
  "/health",
  "/docs",
  "/api/auth/login",
  "/api/auth/refresh",
  "/ws/telemetry",
  // /ws/container JWT ile korunmaz — service token doğrulaması route'un
  // kendi onRequest'inde yapılır (Faz 1 T1.1)
  "/ws/container",
  // Faz 3 T3.3: tünel yolları container_session cookie'siyle doğrulanır
  // (route katmanında) — field JWT'si aranmaz
  "/containers/",
];

/**
 * T1.6: zorunlu şifre değişimi bekleyen token'lar yalnızca bu yollara girer.
 */
const MUST_CHANGE_ALLOWLIST = [
  "/api/auth/change-password",
  "/api/auth/logout",
  "/api/auth/refresh",
];

/**
 * Faz 6 T6.1: MFA kaydı zorunlu roller için izinli yollar (kayıt akışının
 * kendisi + oturum temizliği). Diğer HER yol 403 "MFA kaydi gerekli".
 */
const MFA_ALLOWLIST = [
  "/api/auth/mfa",
  "/api/auth/logout",
  "/api/auth/refresh",
  "/api/auth/change-password",
  "/api/auth/session",
];

function matchesRoutePermission(
  permission: RoutePermission,
  path: string,
  method: string,
): boolean {
  if (!path.startsWith(permission.path)) return false;
  if (permission.methods[0] === "*") return true;
  return permission.methods.includes(method);
}

/** Oturum kullanıcısı için rol izinlerini uygular (Bearer'sız yol — Faz 3). */
function applyRolePermissions(
  user: User,
  path: string,
  method: string,
  reply: FastifyReply,
): FastifyReply | undefined {
  for (const permission of ROUTE_PERMISSIONS) {
    if (matchesRoutePermission(permission, path, method)) {
      if (!permission.roles.includes(user.role)) {
        return reply.status(403).send({ error: "Bu islem icin yetkiniz yok" });
      }
      break;
    }
  }
  return undefined;
}

/**
 * 2026-08-30 (T1.4): PUBLIC önek eşlemesi SEGMENT SINIRLI yapıldı —
 * önceki davranışta "/health" öneki "/healthz" gibi yolları da public
 * sayıyordu (yanlış pozitif). Kural: önek "/" ile bitiyorsa düz startsWith;
 * aksi halde önekten sonraki karakter "/" veya "?" olmalıdır.
 */
function matchesPublicPrefix(path: string, prefix: string): boolean {
  if (prefix.endsWith("/")) return path.startsWith(prefix);
  if (path === prefix) return true;
  if (!path.startsWith(prefix)) return false;
  const next = path[prefix.length];
  return next === "/" || next === "?";
}

export function createRbacHook(
  tokens: ITokenService,
  options?: {
    /**
     * Faz 3 (container tier): `container_session` cookie'sini doğrular.
     * Cookie varsa Bearer yerine oturum kullanıcısı kullanılır; geçersizse
     * 401 (fail-closed). Oturum kullanıcısı geçicidir — mustChangePassword
     * ve MFA zorunluluğu uygulanmaz (field tarafında zaten doğrulandı),
     * rol izinleri aynen uygulanır.
     */
    sessionAuthenticator?: (
      cookieHeader: string | undefined,
    ) => Promise<User | undefined>;
  },
  /** Faz 6 T6.1 — MFA kaydı zorunlu roller (boş liste = enforcement kapalı). */
  mfaRequiredRoles?: Role[],
) {
  return async function rbacPreHandler(
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    const path = request.url;

    if (PUBLIC_PREFIXES.some((p) => matchesPublicPrefix(path, p))) return;

    const sessionAuthenticator = options?.sessionAuthenticator;
  const requiredMfaRoles = mfaRequiredRoles ?? [];
    if (
      sessionAuthenticator &&
      request.headers.cookie !== undefined &&
      request.headers.cookie.includes("container_session")
    ) {
      const sessionUser = await sessionAuthenticator(request.headers.cookie);
      if (!sessionUser) {
        return reply
          .status(401)
          .send({ error: "Gecersiz veya suresi dolmus oturum" });
      }
      (request as unknown as { user: User }).user = sessionUser;
      return applyRolePermissions(sessionUser, path, request.method, reply);
    }

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return reply.status(401).send({ error: "Yetkilendirme gerekli" });
    }

    const token = authHeader.slice(7);
    let user: User;
    try {
      user = await tokens.verifyAccess(token);
    } catch {
      return reply
        .status(401)
        .send({ error: "Gecersiz veya suresi dolmus token" });
    }

    // T1.6: zorunlu şifre değişimi enforcement'ı — allowlist dışı her yol 403.
    // 2026-08-30: guest İSTİSNADIR — otomatik misafir girişi (token yoksa/
    // çıkışta) şifre değişimi bekleyemez; guest salt-okunur dashboard rolüdür.
    if (user.mustChangePassword && user.role !== "guest") {
      const allowed = MUST_CHANGE_ALLOWLIST.some((p) => path.startsWith(p));
      if (!allowed) {
        return reply
          .status(403)
          .send({ error: "Sifre degisimi gerekli" });
      }
    }

    // Faz 6 T6.1: MFA kaydı zorunlu rol — kayıt akışı dışındaki HER yol 403.
    // Enforcement yalnızca mfaRequiredRoles listesinde olan roller için
    // çalışır (container tier boş liste → kapalı). `mfaEnabled` claim'i
    // access token'da taşınır (verifyAccess) — kayıt tamamlanınca YENİ
    // token alınması zorunludur (eski token bayat mfaEnabled=false taşır).
    if (requiredMfaRoles.includes(user.role) && user.mfaEnabled !== true) {
      const allowed = MFA_ALLOWLIST.some((p) => path.startsWith(p));
      if (!allowed) {
        return reply
          .status(403)
          .send({ error: "MFA kaydi gerekli" });
      }
    }

    (request as unknown as { user: User }).user = user;

    return applyRolePermissions(user, path, request.method, reply);
  };
}
