export interface HvacData {
  status: "online" | "offline";
  mode: "cooling" | "warming" | "idle";
  equipmentStatus?: string;
  alarmCount?: number;
  supplyTemp?: number;
  returnTemp?: number;
}

export interface RoomData {
  temp: number;
  humidity?: number;
  setTemp?: number;
  hvacs: [HvacData, HvacData];
}

export interface RoomTemperature {
  temp: number;
  humidity?: number;
  setTemp?: number;
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
