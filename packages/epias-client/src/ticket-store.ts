import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { FetchLike } from "@gd-monorepo/plugin-sdk";

/**
 * EPIAS CAS bilet (TGT) onbellegi.
 *
 * TGT'nin yasam dongusu tek noktada tutulur: bilet dosyada saklanir,
 * suresi dolana kadar yeniden kullanilir, dolunca CAS uzerinden yenisi
 * alinir. Tum EPIAS plugin'leri AYNI store ornegini paylasir — boylece
 * her plugin'in ayri bilet uretip EPIAS throttle'ina takilmasi onlenir.
 *
 * Dosya: `{ "users": { "<kullanici-adi>": { "ticket": "TGT-...", "expiresAt": <epoch-ms> } } }`
 * Yazim atomiktir (tmp + rename) — FilePluginStateStore pattern'iyle ayni.
 */
export interface TicketStoreConfig {
  /** Biletlerin saklanacagi JSON dosyasi. */
  filePath: string;
  /** CAS bilet ucu (test ortami: https://giris-prp.epias.com.tr/cas/v1/tickets). */
  casUrl?: string;
  /** CAS biletinin omru (ms). Dokumanda 2 saat belirtiliyor. */
  ttlMs?: number;
  /** Omru dolmadan bu kadar once (ms) bilet yenilenir. */
  renewBeforeMs?: number;
  /** CAS istegi zaman asimi (ms). */
  timeoutMs?: number;
  /** Testler icin — varsayilan global fetch kullanilir. */
  fetchFn?: FetchLike;
}

interface StoredTicket {
  ticket: string;
  expiresAt: number;
}

interface StoreFile {
  users: Record<string, StoredTicket>;
}

const DEFAULT_TTL_MS = 2 * 60 * 60 * 1000;
const DEFAULT_RENEW_BEFORE_MS = 5 * 60 * 1000;
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_CAS_URL = "https://giris.epias.com.tr/cas/v1/tickets";

export class EpiasTicketStore {
  /** Kullanici basina devam eden bilet alma islemi — es zamanli cift uretimi onler. */
  private readonly inFlight = new Map<string, Promise<string>>();

  constructor(private readonly config: TicketStoreConfig) {}

  /**
   * Sorgu — kullanici icin gecerli bir TGT dondurur.
   * ELEGANT-EXCEPTION: ad bir sorgudur ancak onbellekte gecerli bilet yoksa
   * CAS'ten yeni bilet alip dosyaya yazar. Bilet yasam dongusunun tek
   * noktada tutulmasi (throttle korumasi) bu yan etkiyi zorunlu kilar.
   */
  async ticket(username: string, password: string): Promise<string> {
    const cached = await this.readFile();
    const stored = cached.users[username];
    const renewBefore =
      this.config.renewBeforeMs ?? DEFAULT_RENEW_BEFORE_MS;
    if (stored && stored.expiresAt > Date.now() + renewBefore) {
      return stored.ticket;
    }

    const existing = this.inFlight.get(username);
    if (existing) {
      return existing;
    }

    const promise = this.acquire(username, password).finally(() => {
      this.inFlight.delete(username);
    });
    this.inFlight.set(username, promise);
    return promise;
  }

  /** Komut — kullaniciya ait bileti gecersiz kilar (401 sonrasi kullanilir). */
  async invalidate(username: string): Promise<void> {
    const data = await this.readFile();
    delete data.users[username];
    await this.save(data);
  }

  private async acquire(
    username: string,
    password: string,
  ): Promise<string> {
    const fetchFn: FetchLike = this.config.fetchFn ?? fetch;
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      this.config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    );
    try {
      const response = await fetchFn(
        this.config.casUrl ?? DEFAULT_CAS_URL,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "text/plain",
          },
          body: new URLSearchParams({ username, password }).toString(),
          signal: controller.signal,
        },
      );
      if (response.status !== 201) {
        throw new Error(
          `[EpiasTicketStore] CAS TGT alinamadi — HTTP ${response.status}`,
        );
      }
      const ticket = (await response.text()).trim();
      const data = await this.readFile();
      data.users[username] = {
        ticket,
        expiresAt: Date.now() + (this.config.ttlMs ?? DEFAULT_TTL_MS),
      };
      await this.save(data);
      return ticket;
    } finally {
      clearTimeout(timer);
    }
  }

  private async readFile(): Promise<StoreFile> {
    try {
      const raw = await readFile(this.config.filePath, "utf-8");
      const parsed: unknown = JSON.parse(raw);
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        "users" in parsed
      ) {
        return parsed as StoreFile;
      }
      return { users: {} };
    } catch {
      return { users: {} };
    }
  }

  private async save(data: StoreFile): Promise<void> {
    await mkdir(dirname(this.config.filePath), { recursive: true });
    const tmp = `${this.config.filePath}.tmp`;
    await writeFile(tmp, JSON.stringify(data, null, 2), "utf-8");
    await rename(tmp, this.config.filePath);
  }
}
