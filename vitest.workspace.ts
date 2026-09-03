import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  "packages/shared-types",
  "packages/shared-utils",
  "packages/result",
  "packages/core",
  "packages/tamper-logger",
  "packages/ws-tunnel",
  "packages/platform/messaging",
  "packages/platform/container-access",
  "packages/platform/logging",
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
  // 2026-08-30 (T6): saha uygulaması workspace'e eklendi — root test
  // script'leri artık field/superadmin'i de koşar (önceden nx ile ayrı).
  "apps/field",
  "apps/superadmin",
]);
