export interface ContainerCardProps {
  containerId: string;
  name: string;
  status: "online" | "warning" | "offline";
  connected: boolean;
  soc?: number;
  powerKw?: number;
  temperature?: number;
  deviceCount: number;
  activeDeviceCount: number;
  onClick?: () => void;
}
