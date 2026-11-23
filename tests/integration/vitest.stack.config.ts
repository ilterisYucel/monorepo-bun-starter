import { defineConfig } from "vitest/config";
import { integrationBase } from "./config-base";

/** I-stack katmanı — SPEC v2 / K15 (yalnız kendi runtime'ı). */
export default defineConfig(integrationBase(["web-service/stack/**/*.integration.test.ts"]));
