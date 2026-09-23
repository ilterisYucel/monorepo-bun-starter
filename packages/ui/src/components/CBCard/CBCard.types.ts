export interface CBCardLabels {
  online: string;
  offline: string;
  closed: string;
  open: string;
  detail: string;
}

export interface CBCardProps {
  name: string;
  status: "online" | "offline";
  /** Aux kontak NC — şalter kapalı (K2: SYW6GZ şalter modeli). */
  isClosed: boolean;
  /** Aux kontak NO — şalter açık (K2). */
  isOpen: boolean;
  onDetailClick?: () => void;
  labels?: CBCardLabels;
}
