/**
 * Modbus Simülatör Adapter Contract
 * Gerçek Modbus cihazı ile simülatör arasında köprü
 * Tüm Modbus fonksiyonlarını destekler
 */
export interface IModbusSimulatorAdapter {
  // ============================================
  // HOLDING REGISTERS (4x) - Okuma/Yazma
  // ============================================

  /** Tek bir holding register okur */
  readHoldingRegister(address: number): Promise<number>;

  /** Birden fazla holding register okur */
  readHoldingRegisters(address: number, count: number): Promise<number[]>;

  /** Tek bir holding register yazar */
  writeHoldingRegister(address: number, value: number): Promise<void>;

  /** Birden fazla holding register yazar */
  writeHoldingRegisters(address: number, values: number[]): Promise<void>;

  // ============================================
  // INPUT REGISTERS (3x) - Sadece Okuma
  // ============================================

  /** Tek bir input register okur */
  readInputRegister(address: number): Promise<number>;

  /** Birden fazla input register okur */
  readInputRegisters(address: number, count: number): Promise<number[]>;

  // ============================================
  // COILS (0x) - Okuma/Yazma
  // ============================================

  /** Tek bir coil okur */
  readCoil(address: number): Promise<boolean>;

  /** Birden fazla coil okur */
  readCoils(address: number, count: number): Promise<boolean[]>;

  /** Tek bir coil yazar */
  writeCoil(address: number, value: boolean): Promise<void>;

  /** Birden fazla coil yazar */
  writeMultipleCoils(address: number, values: boolean[]): Promise<void>;

  // ============================================
  // DISCRETE INPUTS (1x) - Sadece Okuma
  // ============================================

  /** Tek bir discrete input okur */
  readDiscreteInput(address: number): Promise<boolean>;

  /** Birden fazla discrete input okur */
  readDiscreteInputs(address: number, count: number): Promise<boolean[]>;
}
