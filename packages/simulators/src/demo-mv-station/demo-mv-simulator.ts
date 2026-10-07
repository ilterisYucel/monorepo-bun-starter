// Demo MV istasyon simülatörü (SPEC UC-9 / T-37) — OG köşk H01–H05 + toprak
// ayırıcıları. İnterlock'lar burada uygulanır (FR-9.2): toprak kapalıyken
// kesici kapanmaz, kesici kapalıyken toprak kapanmaz, H01 toprağı POI'den
// enerjili olduğundan HER ZAMAN kilitli.

import { COILS, INPUT_REGS } from "./register-map";
import { SimulatorServer } from "../server";
import type { SimulatorNetworkConfig } from "../server";
import { DemoMvStationAdapter } from "./demo-mv-modbus-adapter";

type CellId = "H01" | "H02" | "H04" | "H05";
type EarthId = "H01" | "H04" | "H05";

interface MvState {
  breakers: Record<CellId, boolean>;
  earth: Record<EarthId, boolean>;
  kV: number;
  hz: number;
}

export interface DemoMvStationConfig {
  readonly network?: SimulatorNetworkConfig;
}

/**
 * DemoMvStationSimulator — sözleşme:
 * - Başlangıç: tüm kesiciler kapalı, topraklar açık, kV=34,5, hz=50.
 * - writeCoil komutları ANINDA uygulanır; interlock ihlali no-op (reddedilir).
 * - H01 toprak ayırıcısı her zaman kilitli (POI enerjili — nova kuralı).
 * - readInputRegister pozisyon/kV/hz; bilinmeyen adres → 0.
 */
export class DemoMvStationSimulator {
  private state: MvState = {
    breakers: { H01: true, H02: true, H04: true, H05: true },
    earth: { H01: false, H04: false, H05: false },
    kV: 34.5,
    hz: 50,
  };
  private readonly network: SimulatorNetworkConfig | undefined;
  private server: SimulatorServer | undefined;

  constructor(config: DemoMvStationConfig = {}) {
    this.network = config.network;
  }

  async start(): Promise<void> {
    if (this.server || this.network === undefined) return;
    this.server = new SimulatorServer({
      adapter: new DemoMvStationAdapter(this),
      network: this.network,
      tick: () => {},
    });
    await this.server.start();
  }

  async stop(): Promise<void> {
    await this.server?.stop();
    this.server = undefined;
  }

  port(): number {
    return this.server?.port() ?? this.network?.port ?? 0;
  }

  /** Komut — bilinmeyen adres/reddedilen interlock → değişiklik yok. */
  writeCoil(address: number, value: boolean): void {
    if (!value) return;
    const s = this.state;
    switch (address) {
      case COILS.H01_OPEN:
        s.breakers.H01 = false;
        break;
      case COILS.H01_CLOSE:
        if (!s.earth.H01) s.breakers.H01 = true;
        break;
      case COILS.H02_OPEN:
        s.breakers.H02 = false;
        break;
      case COILS.H02_CLOSE:
        s.breakers.H02 = true;
        break;
      case COILS.H04_OPEN:
        s.breakers.H04 = false;
        break;
      case COILS.H04_CLOSE:
        if (!s.earth.H04) s.breakers.H04 = true;
        break;
      case COILS.H05_OPEN:
        s.breakers.H05 = false;
        break;
      case COILS.H05_CLOSE:
        if (!s.earth.H05) s.breakers.H05 = true;
        break;
      case COILS.H01_ES_CLOSE:
        // H01 toprağı POI'den enerjili — her zaman kilitli.
        break;
      case COILS.H01_ES_OPEN:
        s.earth.H01 = false;
        break;
      case COILS.H04_ES_CLOSE:
        if (!s.breakers.H04) s.earth.H04 = true;
        break;
      case COILS.H04_ES_OPEN:
        s.earth.H04 = false;
        break;
      case COILS.H05_ES_CLOSE:
        if (!s.breakers.H05) s.earth.H05 = true;
        break;
      case COILS.H05_ES_OPEN:
        s.earth.H05 = false;
        break;
      default:
        break;
    }
  }

  readCoil(address: number): boolean {
    void address;
    return false;
  }

  readDiscreteInput(address: number): boolean {
    const r = this.readInputRegister(address);
    return r !== 0;
  }

  readInputRegister(address: number): number {
    const s = this.state;
    switch (address) {
      case INPUT_REGS.H01_BREAKER:
        return s.breakers.H01 ? 1 : 0;
      case INPUT_REGS.H02_BREAKER:
        return s.breakers.H02 ? 1 : 0;
      case INPUT_REGS.H04_BREAKER:
        return s.breakers.H04 ? 1 : 0;
      case INPUT_REGS.H05_BREAKER:
        return s.breakers.H05 ? 1 : 0;
      case INPUT_REGS.H01_EARTH:
        return s.earth.H01 ? 1 : 0;
      case INPUT_REGS.H04_EARTH:
        return s.earth.H04 ? 1 : 0;
      case INPUT_REGS.H05_EARTH:
        return s.earth.H05 ? 1 : 0;
      case INPUT_REGS.KV_X10:
        return Math.round(s.kV * 10);
      case INPUT_REGS.HZ_X100:
        return Math.round(s.hz * 100);
      default:
        return 0;
    }
  }

  readHoldingRegister(_address: number): number {
    return 0;
  }

  writeHoldingRegister(_address: number, _value: number): void {
    // Holding register yoktur.
  }

  /** Test/gözle erişim (sorgu). */
  cellPosition(id: CellId): boolean {
    return this.state.breakers[id];
  }

  earthClosed(id: EarthId): boolean {
    return this.state.earth[id];
  }
}
