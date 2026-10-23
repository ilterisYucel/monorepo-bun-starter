import type { ManeuverRegistry } from "@gd-monorepo/platform-commands";

/** ListCatalogUseCase — manevra/operasyon kataloğu (UC-3 D1). */
export class ListCatalogUseCase {
  constructor(private readonly registry: ManeuverRegistry) {}

  list(kind: "maneuver" | "operation") {
    return this.registry.list(kind);
  }
}
