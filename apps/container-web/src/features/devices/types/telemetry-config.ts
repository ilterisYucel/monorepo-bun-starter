export interface TelemetryEntry {
  name: string;
  description: string;
  unit: string;
  registerAddress: number;
  registerTableType: "INPUT_REGISTER" | "HOLDING_REGISTER" | "COIL" | "DISCRETE_INPUT";
  registerDataType: string;
  scale?: number;
  offset?: number;
  priority?: number;
  byteOrder?: "BIG_ENDIAN" | "LITTLE_ENDIAN";
  tags?: Record<string, string>;
}

export interface TelemetryConfigResponse {
  deviceId: string;
  name: string;
  manufacturer: string;
  model: string;
  protocol: string;
  connection?: {
    host?: string;
    port?: number;
    slaveId?: number;
    [key: string]: unknown;
  };
  telemetry: TelemetryEntry[];
  commands: string[];
}
