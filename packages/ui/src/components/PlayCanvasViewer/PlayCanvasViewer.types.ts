export interface Container3DState {
  id: string;
  label: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  status: "online" | "warning" | "offline" | "idle";
  telemetry?: {
    soc?: number;
    power?: number;
    temperature?: number;
  };
}

export interface PlayCanvasViewerProps {
  containers: Container3DState[];
  onContainerClick?: (containerId: string) => void;
  selectedContainerId?: string;
  orbitControls?: boolean;
  showGrid?: boolean;
  showLabels?: boolean;
  height?: number | string;
  modelUrl?: string;
}
