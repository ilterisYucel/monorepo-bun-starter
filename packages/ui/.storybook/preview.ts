import type { Preview } from "@storybook/react";
import React from "react";
import { SpriteTextureProvider } from "../src/core/SpriteTextureProvider";
import { SPRITE_ASSETS } from "../src/graphics/textures";

// Global decorator: tüm story'ler SPRITE_ASSETS sprite setiyle sarılır.
// Böylece her element story'si sprite'ı gösterir; texture yüklenemezse
// bileşenler kendi fallback çizimlerine döner (boş ekran riski yoktur).
const preview: Preview = {
  decorators: [
    (Story) =>
      React.createElement(
        SpriteTextureProvider,
        { assets: SPRITE_ASSETS },
        React.createElement(Story),
      ),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
      },
    },
    backgrounds: {
      default: "dark",
      values: [
        { name: "dark", value: "#0f0f1a" },
        { name: "card", value: "#1a1a2e" },
        { name: "transparent", value: "transparent" },
      ],
    },
  },
};

export default preview;
