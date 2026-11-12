import type { Preview } from "@storybook/react";
import React from "react";
import { ThemeProvider } from "../src/theme";

const preview: Preview = {
  decorators: [
    (Story) =>
      React.createElement(
        ThemeProvider,
        { mode: "light" },
        React.createElement(Story),
      ),
  ],
  parameters: {
    backgrounds: {
      default: "light",
      values: [
        { name: "light", value: "#F4F7FC" },
        { name: "dark", value: "#0B0F17" },
        { name: "surface", value: "#FFFFFF" },
      ],
    },
  },
};

export default preview;
