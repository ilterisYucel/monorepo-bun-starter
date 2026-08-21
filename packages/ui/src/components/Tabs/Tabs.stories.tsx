import type { Meta, StoryObj } from "@storybook/react";
import { Tabs } from "./Tabs";

const meta: Meta<typeof Tabs> = {
  title: "Components/Tabs",
  component: Tabs,
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof Tabs>;

export const Default: Story = {
  args: {
    tabs: [
      { key: "total", label: "Saha Toplam Güç", content: <div>Toplam güç içeriği</div> },
      { key: "soc", label: "Saha Ort. SoC", content: <div>SoC içeriği</div> },
      { key: "containers", label: "Konteyner Bazlı", content: <div>Konteyner içeriği</div> },
    ],
  },
};

export const WithHiddenTab: Story = {
  args: {
    tabs: [
      { key: "a", label: "Görünür", content: <div>A</div> },
      { key: "b", label: "Gizli", content: <div>B</div>, visible: false },
      { key: "c", label: "Görünür 2", content: <div>C</div> },
    ],
  },
};

export const WithDefaultKey: Story = {
  args: {
    defaultKey: "soc",
    tabs: [
      { key: "total", label: "Toplam", content: <div>Toplam</div> },
      { key: "soc", label: "SoC", content: <div>SoC</div> },
    ],
  },
};
