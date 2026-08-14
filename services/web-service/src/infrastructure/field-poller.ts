import type { ISqlDatabase } from "@gd-monorepo/core";

interface AdminFieldRow {
  id: string;
  name: string;
  location: { lat: number; lng: number };
  api_url: string | null;
  status: string;
  container_count: number;
  online_containers: number;
  total_power_mw: number | null;
  avg_soc: number | null;
  active_alarms: number;
  last_seen_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export class FieldPoller {
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly db: ISqlDatabase,
    private readonly intervalMs: number = 30000,
  ) {}

  async start(): Promise<void> {
    await this.ensureSchema();
    this.timer = setInterval(() => {
      this.poll().catch((err) => console.error("[FieldPoller] Hata:", err));
    }, this.intervalMs);
    console.log(`[FieldPoller] Baslatildi (${this.intervalMs}ms)`);
  }

  async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    console.log("[FieldPoller] Durduruldu");
  }

  private async ensureSchema(): Promise<void> {
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS admin_fields (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        location JSONB NOT NULL DEFAULT '{"lat": 0, "lng": 0}',
        api_url TEXT,
        status TEXT DEFAULT 'offline',
        container_count INTEGER DEFAULT 0,
        online_containers INTEGER DEFAULT 0,
        total_power_mw DOUBLE PRECISION,
        avg_soc DOUBLE PRECISION,
        active_alarms INTEGER DEFAULT 0,
        last_seen_at TIMESTAMPTZ,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `);
  }

  private async poll(): Promise<void> {
    const fields = await this.db.query<AdminFieldRow>("SELECT * FROM admin_fields WHERE api_url IS NOT NULL");

    await Promise.allSettled(
      fields.map(async (f) => {
        if (!f.api_url) return;
        try {
          const resp = await fetch(`${f.api_url}/api/fields/${f.id}/summary`, {
            signal: AbortSignal.timeout(10000),
          });
          if (!resp.ok) {
            await this.updateStatus(f.id, { status: "offline" });
            return;
          }
          const summary = await resp.json() as {
            containers?: Array<{ connected: boolean }>;
            telemetries?: Array<{ totalPowerMw?: number; avgSoc?: number; activeAlarms?: number }>;
          };
          const containers = summary.containers ?? [];
          const onlineCount = containers.filter((c) => c.connected).length;

          await this.db.execute(
            `UPDATE admin_fields
             SET status = 'online',
                 container_count = $2,
                 online_containers = $3,
                 last_seen_at = NOW(),
                 updated_at = NOW()
             WHERE id = $1`,
            [f.id, containers.length, onlineCount],
          );
          console.log(`[FieldPoller] ${f.name}: ${onlineCount}/${containers.length} cevrimici`);
        } catch {
          await this.updateStatus(f.id, { status: "offline" });
        }
      }),
    );
  }

  private async updateStatus(id: string, update: { status: string }): Promise<void> {
    await this.db.execute(
      `UPDATE admin_fields SET status = $2, updated_at = NOW() WHERE id = $1`,
      [id, update.status],
    );
  }

  async registeredField(data: {
    name: string;
    location?: { lat: number; lng: number };
    apiUrl?: string;
    metadata?: Record<string, unknown>;
  }): Promise<AdminFieldRow> {
    const row = await this.db.queryOne<AdminFieldRow>(
      `INSERT INTO admin_fields (name, location, api_url, metadata)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [
        data.name,
        JSON.stringify(data.location ?? { lat: 0, lng: 0 }),
        data.apiUrl ?? null,
        JSON.stringify(data.metadata ?? {}),
      ],
    );
    return row!;
  }

  async fields(): Promise<AdminFieldRow[]> {
    return this.db.query<AdminFieldRow>("SELECT * FROM admin_fields ORDER BY created_at ASC");
  }

  async field(id: string): Promise<AdminFieldRow | undefined> {
    return this.db.queryOne<AdminFieldRow>("SELECT * FROM admin_fields WHERE id = $1", [id]);
  }

  async deleteField(id: string): Promise<void> {
    await this.db.execute("DELETE FROM admin_fields WHERE id = $1", [id]);
  }

  async updateField(id: string, updates: { name?: string; location?: string; apiUrl?: string; metadata?: string }): Promise<AdminFieldRow> {
    const sets: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    if (updates.name !== undefined) {
      sets.push(`name = $${i++}`);
      params.push(updates.name);
    }
    if (updates.location !== undefined) {
      sets.push(`location = $${i++}`);
      params.push(updates.location);
    }
    if (updates.apiUrl !== undefined) {
      sets.push(`api_url = $${i++}`);
      params.push(updates.apiUrl);
    }
    if (updates.metadata !== undefined) {
      sets.push(`metadata = $${i++}`);
      params.push(updates.metadata);
    }

    if (sets.length === 0) {
      const existing = await this.field(id);
      if (!existing) throw new Error(`Field not found: ${id}`);
      return existing;
    }

    sets.push(`updated_at = NOW()`);
    params.push(id);

    const row = await this.db.queryOne<AdminFieldRow>(
      `UPDATE admin_fields SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
      params,
    );
    if (!row) throw new Error(`Field not found: ${id}`);
    return row;
  }
}
