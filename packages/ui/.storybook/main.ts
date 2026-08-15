import type { StorybookConfig } from "@storybook/react-vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(mdx|ts|tsx)"],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-docs",
  ],
  framework: "@storybook/react-vite",
  viteFinal: (viteConfig) => {
    viteConfig.resolve = viteConfig.resolve || {};
    viteConfig.resolve.alias = {
      ...viteConfig.resolve.alias,
      "@gd-monorepo/ui": path.resolve(dirname, "../src"),
    };
    return viteConfig;
  },
  staticDirs: [],
  core: {
    disableTelemetry: true,
  },
};

export default config;
