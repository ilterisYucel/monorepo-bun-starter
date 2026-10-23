import { asFunction } from "awilix";
import type { AwilixContainer } from "awilix";
import { serviceTier } from "../../config/default";
import { FieldEventCollector } from "./infrastructure/field-event-collector";
import { FieldEventReader } from "./infrastructure/field-event-reader";
import { NotificationsUseCase } from "../../application/notifications/notifications-use-case";
import { OperationRequester } from "./infrastructure/operation-requester";

/**
 * Boss tier kompozisyonu (K5/K14).
 *
 * Field olay poller'ı, bildirim okuma use-case'i ve field operasyon tetikleyicisi.
 * Tier koşulları yalnız burada.
 */
export function registerBossTier(container: AwilixContainer): void {
  container.register({
    fieldEventCollector: asFunction(
      ({ config, postgres, logger, hubConsumerClient }) => {
        const tier = serviceTier(config);
        if (tier !== "boss") return undefined;
        return new FieldEventCollector(postgres, logger, {
          ...(hubConsumerClient ? { client: hubConsumerClient } : {}),
          serviceId: config.get<string>("hub.fieldServiceId"),
          demoSeed: config.get<boolean>("fieldEvents.demoSeed"),
        });
      },
    ).singleton(),

    notifications: asFunction(({ postgres }) =>
      new NotificationsUseCase(new FieldEventReader(postgres)),
    ).singleton(),

    operationRequester: asFunction(({ config, hubConsumerClient }) => {
      const tier = serviceTier(config);
      if (tier !== "boss" || !hubConsumerClient) return undefined;
      return new OperationRequester({
        client: hubConsumerClient,
        serviceId: config.get<string>("hub.fieldServiceId"),
      });
    }).singleton(),
  });
}
