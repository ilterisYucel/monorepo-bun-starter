export interface HvacData {
  status: "online" | "offline";
  mode: "cooling" | "warming" | "idle";
}

export interface RoomTemperature {
  temp: number;
}

export interface RoomSlotPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RoomCardPosition {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  hvac1: RoomSlotPosition;
  hvac2: RoomSlotPosition;
}
