import type { Meta, StoryObj } from "@storybook/react";
import { SCADA_ICONS } from "../../icons";
import { SummaryCard } from "./SummaryCard";

const meta: Meta<typeof SummaryCard> = {
  title: "Components/SummaryCard",
  component: SummaryCard,
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof SummaryCard>;

export const Ok: Story = {
  args: {
    icon: <SCADA_ICONS.dashboard size={18} />,
    value: "52.1 V",
    label: "DC Voltaj",
    variant: "ok",
  },
};

export const Alarm: Story = {
  args: {
    icon: <SCADA_ICONS.temperature size={18} />,
    value: "34 °C",
    label: "Sıcaklık",
    variant: "alarm",
  },
};

export const Fault: Story = {
  args: {
    icon: <SCADA_ICONS.close size={18} />,
    value: "0 A",
    label: "Akım",
    variant: "fault",
  },
};

export const Info: Story = {
  args: {
    icon: <SCADA_ICONS.logInfo size={18} />,
    value: "96%",
    label: "SoH",
    variant: "info",
  },
};
