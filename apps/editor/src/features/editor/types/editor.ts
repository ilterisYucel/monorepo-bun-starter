import type { DeviceType, ProtocolType, DefaultRegister } from "@gd-monorepo/device-library";
import type { Node, Edge } from "@xyflow/react";

export interface DeviceInstanceConfig {
  name: string;
  protocol?: ProtocolType;
  connectionConfig?: Record<string, unknown>;
  registers: DefaultRegister[];
}

export interface DeviceNodeData extends DeviceInstanceConfig {
  deviceType: DeviceType;
}

export type DeviceNode = Node<DeviceNodeData>;

export interface ProjectFile {
  version: string;
  name: string;
  devices: {
    id: string;
    type: DeviceType;
    name: string;
    position: { x: number; y: number };
    protocol: {
      type: ProtocolType;
      config: Record<string, unknown>;
    };
    registers: DefaultRegister[];
  }[];
  connections: {
    from: string;
    to: string;
    type: "power" | "communication";
  }[];
}

export interface EditorSnapshot {
  nodes: DeviceNode[];
  edges: Edge[];
  selectedNodeId: string | null;
  projectName: string;
}
