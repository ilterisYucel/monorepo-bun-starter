import type { Rack } from "../../types/rack";

export interface RackCardProps extends Rack {
  /** Detay sayfasına yönlendirme callback'i */
  onDetailClick?: () => void;
}