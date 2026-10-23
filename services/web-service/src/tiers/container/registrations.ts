import { asFunction } from "awilix";
import type { AwilixContainer } from "awilix";
import { serviceTier } from "../../config/default";
import { StatelessSessionAuthenticator } from "./infrastructure/session/stateless-session-authenticator";
import { JoseTokenSigner } from "../../infrastructure/auth/jose-token-signer";

/**
 * Container tier kompozisyonu (K5/K14).
 *
 * Yalnız container'a özgü bileşen: agent imzalı `container_session` JWT'sini
 * stateless doğrulayan adaptör. Tier koşulu yalnız burada yaşar.
 */
export function registerContainerTier(container: AwilixContainer): void {
  container.register({
    containerSessionAuthenticator: asFunction(({ config, authCfg }) => {
      const tier = serviceTier(config);
      if (tier !== "container") return undefined;
      return new StatelessSessionAuthenticator(
        new JoseTokenSigner(authCfg.jwtSecret),
      );
    }).singleton(),
  });
}
