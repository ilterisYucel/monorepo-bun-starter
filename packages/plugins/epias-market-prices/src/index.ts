import { EpiasMarketPricesPlugin } from "./plugin";
import { FetchHttpGateway } from "./http-gateway";

export { EpiasMarketPricesPlugin } from "./plugin";
export { FetchHttpGateway, type HttpGateway } from "./http-gateway";

/**
 * Statik kaynak icin varsayilan plugin ornegi.
 * Integration service run.ts'de bu ornegi StaticPluginSource'a gecirir.
 */
export const plugin = new EpiasMarketPricesPlugin(new FetchHttpGateway());
