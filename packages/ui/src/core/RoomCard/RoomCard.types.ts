import type { RoomData, RoomPosition, StepConfig } from "../../components/TMSGraphic/TMSGraphic.types";

export interface RoomCardProps {
  room: RoomData;
  roomPos: RoomPosition;
  config: StepConfig;
  frameCount: number;
}
