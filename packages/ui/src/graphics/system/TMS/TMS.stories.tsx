import React from "react";
import { TMS } from "@gd-monorepo/ui";
import type { RoomData } from "../../deprecated/TMSGraphic/TMSGraphic.types";
import { createMockTMSSystemRoom } from "../../../__stories__/mocks/factories";

const meta = { title: "Graphics/TMS", component: TMS, tags: ["autodocs"] };
export default meta;

const allOnlineRooms: RoomData[] = [
  createMockTMSSystemRoom({
    temp: 22,
    hvacs: [
      { status: "online", mode: "cooling" },
      { status: "online", mode: "warming" },
    ],
  }),
  createMockTMSSystemRoom({
    temp: 25,
    hvacs: [
      { status: "online", mode: "cooling" },
      { status: "online", mode: "cooling" },
    ],
  }),
  createMockTMSSystemRoom({
    temp: 28,
    hvacs: [
      { status: "online", mode: "cooling" },
      { status: "online", mode: "cooling" },
    ],
  }),
  createMockTMSSystemRoom({
    temp: 30,
    hvacs: [
      { status: "online", mode: "cooling" },
      { status: "online", mode: "cooling" },
    ],
  }),
];

export const AllOnline = () => (
  <div style={{ width: 820, background: "#0f0f1a", borderRadius: 8 }}>
    <TMS rooms={allOnlineRooms} panel_temp={32} status="online" width={800} bordered showRefresh={false} />
  </div>
);

const mixedRooms: RoomData[] = [
  allOnlineRooms[0]!,
  allOnlineRooms[1]!,
  createMockTMSSystemRoom({
    temp: 28,
    hvacs: [
      { status: "offline", mode: "idle" },
      { status: "offline", mode: "idle" },
    ],
  }),
  createMockTMSSystemRoom({
    temp: 30,
    hvacs: [
      { status: "online", mode: "cooling" },
      { status: "offline", mode: "idle" },
    ],
  }),
];

export const MixedStatus = () => (
  <div style={{ width: 820, background: "#0f0f1a", borderRadius: 8 }}>
    <TMS rooms={mixedRooms} panel_temp={25} status="online" width={800} bordered showRefresh={false} />
  </div>
);

const singleRoom: RoomData[] = [
  createMockTMSSystemRoom({
    temp: 18,
    hvacs: [
      { status: "online", mode: "warming" },
      { status: "online", mode: "warming" },
    ],
  }),
];

export const SingleRoom = () => (
  <div style={{ width: 820, background: "#0f0f1a", borderRadius: 8 }}>
    <TMS rooms={singleRoom} panel_temp={20} status="online" width={800} bordered showRefresh={false} />
  </div>
);
