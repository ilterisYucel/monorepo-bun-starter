// Frontend manevra konfigürasyon tipi — katalog migrasyonuna (Faz D2) kadar
// apps/container-web + apps/field tarafından kullanılır. Sunucu tarafı kayıt
// sözleşmesi `maneuver.ts` içindeki `ManeuverRecord`'dur (KOMUT-MANEVRA-
// OPERASYON-MIMARISI.md §5); bu tip o migrasyonla birlikte kalkacaktır.

import type { CommandStep } from "./command";

/** Manevra konfigürasyonu — birden fazla cihaza sıralı/paralel komut zinciri */
export interface ManeuverConfig {
  name: string;
  label: string;
  description?: string;
  mode: "parallel" | "sequential";
  steps: CommandStep[];
  rollbackSteps?: CommandStep[];
  onFailure?: "stop" | "continue";
}
