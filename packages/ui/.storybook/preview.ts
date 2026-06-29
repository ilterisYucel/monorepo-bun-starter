import type { Preview } from "@storybook/react";

const preview: Preview = {
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
      ],
    },
  },
};

export default preview;
