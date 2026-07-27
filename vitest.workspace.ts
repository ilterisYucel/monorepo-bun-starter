import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  "packages/shared-types",
  "packages/shared-utils",
  "packages/core",
  "packages/simulators",
  "packages/device-library",
  "packages/eslint-plugin-energy",
  "packages/ui",
  "packages/services/web-service",
  "packages/services/data-service",
  "packages/services/device-service",
  "apps/container-web",
  "apps/container-desktop",
  "apps/demo-backend",
  "apps/editor",
]);
