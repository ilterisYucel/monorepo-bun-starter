import { asFunction } from "awilix";
import type { AwilixContainer } from "awilix";
import { serviceTier } from "../../config/default";
import { HubContainerView } from "./infrastructure/container-telemetry";
import { ContainerConnectionTelemetryPublisher } from "./infrastructure/container-telemetry";
import { HubManeuverChannel } from "./infrastructure/hub-maneuver-channel";
import { GetFieldContainersUseCase } from "../../application/telemetry/get-field-containers-use-case";
import { GetContainerTelemetryUseCase } from "../../application/telemetry/get-container-telemetry-use-case";
import { ListFieldEventsUseCase } from "../../application/events/list-field-events-use-case";
import { LogEventFeed } from "../../infrastructure/persistence/log-event-feed";
import { DemoEarthingInterlock } from "../../infrastructure/interlock/demo-earthing-interlock";

/**
 * Field tier kompozisyonu (K5/K14).
 *
 * Konteyner görünümü (presence + TTL cache + hub relay), telemetri use-case'leri,
 * uzak manevra kanalı ve olay feed'i. Tier koşulları yalnız burada.
 */
export function registerFieldTier(container: AwilixContainer): void {
  container.register({
    containerProxy: asFunction(({ config, mq, hubConsumerClient }) => {
      const tier = serviceTier(config);
      if (tier !== "field" || !hubConsumerClient) return undefined;
      const view = new HubContainerView({
        peers: () => hubConsumerClient.peers(),
        access: (request) => hubConsumerClient.access(request),
        serviceId: config.get<string>("hub.containerServiceId"),
        latestCacheTtlMs: config.get<number>("tunnel.latestCacheTtlMs"),
      });
      // PPC sinyal kaynağı (R-07/FL-07): durum geçişi → synthetic MANAGEMENT.
      view.addObserver(new ContainerConnectionTelemetryPublisher(mq));
      return view;
    }).singleton(),

    fieldContainers: asFunction(({ containerProxy }) =>
      containerProxy ? new GetFieldContainersUseCase(containerProxy) : undefined,
    ).singleton(),
    containerTelemetry: asFunction(({ containerProxy }) =>
      containerProxy ? new GetContainerTelemetryUseCase(containerProxy) : undefined,
    ).singleton(),

    listFieldEvents: asFunction(({ config, postgres }) => {
      const tier = serviceTier(config);
      const fieldId = config.get<string | undefined>("site.fieldId");
      if (tier !== "field" || !fieldId) return undefined;
      return new ListFieldEventsUseCase(new LogEventFeed(postgres), fieldId);
    }).singleton(),

    // Field tier: I-1 toprak interlock (SPEC UC-10) — diğer tier'larda yok.
    fieldInterlock: asFunction(({ config, timescale }) => {
      if (serviceTier(config) !== "field") return undefined;
      return new DemoEarthingInterlock(timescale, {
        mvDeviceId: "DEMO-MV-1",
        earthingTelemetry: ["H04 Earth", "H05 Earth"],
      }).hook();
    }).singleton(),

    // Uzak adım kanalı — konteynerin KENDİ manevra yürütme rotasına gider.
    tunnelManeuverChannel: asFunction(({ config, hubConsumerClient, logger }) => {
      const tier = serviceTier(config);
      if (tier !== "field" || !hubConsumerClient) return undefined;
      return new HubManeuverChannel({
        client: hubConsumerClient,
        serviceId: config.get<string>("hub.containerServiceId"),
        logger,
      });
    }).singleton(),
  });
}
