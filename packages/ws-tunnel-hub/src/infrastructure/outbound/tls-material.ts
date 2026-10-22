import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { HubTlsConfig } from "../../config/hub-config";

/** Okunmuş/üretilmiş TLS materyali (PEM içerikleri). */
export interface TlsMaterial {
  readonly cert: string;
  readonly key: string;
}

/**
 * TLS materyalini çözer: BYO dosyalar verilmişse okur; yoksa self-signed
 * üretir (openssl ile, dizinde kalıcı). Hiçbiri yoksa undefined (http).
 */
export function loadTlsMaterial(
  tls: HubTlsConfig | undefined,
): TlsMaterial | undefined {
  if (tls === undefined) return undefined;
  if (tls.certPath !== undefined && tls.keyPath !== undefined) {
    return {
      cert: readFileSync(tls.certPath, "utf8"),
      key: readFileSync(tls.keyPath, "utf8"),
    };
  }
  if (tls.selfSigned === true) return ensureSelfSigned(tls);
  return undefined;
}

/**
 * Self-signed sertifika üretir (yoksa) ve PEM içeriklerini döner. SAN'lar:
 * host, localhost, 127.0.0.1 — tarayıcı/agent loobback erişimi için.
 */
function ensureSelfSigned(tls: HubTlsConfig): TlsMaterial {
  const dir = tls.dir ?? "/tmp/hub-tls";
  const certFile = join(dir, "hub-cert.pem");
  const keyFile = join(dir, "hub-key.pem");
  if (existsSync(certFile) && existsSync(keyFile)) {
    return {
      cert: readFileSync(certFile, "utf8"),
      key: readFileSync(keyFile, "utf8"),
    };
  }
  mkdirSync(dir, { recursive: true });
  const host = tls.host ?? "localhost";
  const san = [`DNS:${host}`, "DNS:localhost", "IP:127.0.0.1"];
  execFileSync(
    "openssl",
    [
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-keyout",
      keyFile,
      "-out",
      certFile,
      "-days",
      "825",
      "-subj",
      `/CN=${host}`,
      "-addext",
      `subjectAltName=${san.join(",")}`,
    ],
    { stdio: "ignore" },
  );
  return {
    cert: readFileSync(certFile, "utf8"),
    key: readFileSync(keyFile, "utf8"),
  };
}
