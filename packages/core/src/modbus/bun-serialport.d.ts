/**
 * `bun-serialport` 0.2.0 tip taşımıyor (pakette .d.ts yok) — yalnız
 * kullandığımız yüzey bildirilir. Modbus RTU tarafı `SerialSocketAdapter`
 * üzerinden erişir.
 */
declare module "bun-serialport" {
  import { EventEmitter } from "node:events";

  export interface SerialPortOptions {
    readonly path: string;
    readonly baudRate: number;
    readonly dataBits?: 5 | 6 | 7 | 8;
    readonly stopBits?: 1 | 2;
    readonly parity?: "none" | "even" | "odd";
    readonly rtscts?: boolean;
    readonly lock?: boolean;
    readonly autoOpen?: boolean;
  }

  export class SerialPort extends EventEmitter {
    constructor(options: SerialPortOptions);
    readonly path: string;
    readonly baudRate: number;
    readonly isOpen: boolean;
    open(): Promise<void>;
    close(): Promise<void>;
    write(data: Uint8Array | ArrayBuffer | number[] | string): Promise<void>;
    flush(): Promise<void>;
    drain(): Promise<void>;
  }

  export function list(): Promise<Array<{ path: string; manufacturer?: string }>>;
}
