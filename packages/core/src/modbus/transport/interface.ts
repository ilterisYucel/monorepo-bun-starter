// Modbus taşıma katmanı sözleşmesi (Strategy pattern).
// ModbusDevice, gerçek (TCP/RTU) veya simüle transport arasında ayrım YAPMAZ —
// her ikisi de bu sözleşmeyi implement eder.

export interface IModbusTransport {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  reconnect(): Promise<void>;
  isConnected(): boolean;

  readHoldingRegisters(address: number, count: number): Promise<number[]>;
  writeHoldingRegisters(address: number, values: number[]): Promise<void>;

  readInputRegisters(address: number, count: number): Promise<number[]>;

  readCoils(address: number, count: number): Promise<boolean[]>;
  writeCoils(address: number, values: boolean[]): Promise<void>;

  readDiscreteInputs(address: number, count: number): Promise<boolean[]>;
}
