// apps/web/src/features/hvac/index.ts
export { useHvacData, HVAC_QUERY_KEY } from "./hooks/useHvacData";
export { hvacApi } from "./services/hvacApi";
export { telemetriesToHvacUnits } from "./utils/hvacHelpers";
export { hvacUnitsToTmsProps } from "./utils/tmsAdapter";
export type { HvacUnit, HvacAlarms, HvacAverages } from "./types/hvac";
