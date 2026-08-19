import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  "packages/shared-types",
  "packages/shared-utils",
  "packages/core",
  "packages/plugin-sdk",
  "packages/epias-client",
  "packages/plugins/epias-market-prices",
  "packages/simulators",
  "packages/eslint-plugin-energy",
  "packages/ui",
  "services/web-service",
  "services/data-service",
  "services/device-service",
  "services/integration-service",
  "apps/container-web",
  "apps/container-desktop",
  "apps/demo-backend",
  "apps/editor",
]);
