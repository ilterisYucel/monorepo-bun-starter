export interface IModbusClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  reconnect(): Promise<void>;
  isConnected(): boolean;

  readHoldingRegisters(address: number, count: number): Promise<number[]>;
  writeSingleRegister(address: number, value: number): Promise<void>;
  writeMultipleRegisters(address: number, values: number[]): Promise<void>;

  readInputRegisters(address: number, count: number): Promise<number[]>;

  readCoils(address: number, count: number): Promise<boolean[]>;
  writeSingleCoil(address: number, value: boolean): Promise<void>;
  writeMultipleCoils(address: number, values: boolean[]): Promise<void>;

  readDiscreteInputs(address: number, count: number): Promise<boolean[]>;
}
