import type { RoomCardPosition, RoomTemperature } from "../../types";

export interface RoomCardProps {
  room: RoomTemperature;
  roomPos: RoomCardPosition;
  config: { step: number };
}
