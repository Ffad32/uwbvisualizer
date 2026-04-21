export interface AnchorPosition {
  x: number;
  y: number;
}

export interface PositionMessage {
  type: 'position';
  x: number | null;
  y: number | null;
  distances: number[];
  battery_v: string;
  chip_id: string;
  timestamp: number;
}

export interface AnchorStatusMessage {
  type: 'anchor_status';
  anchor_number: 1 | 2 | 3;
  chip_id: string;
  battery_v: string;
  timestamp: number;
}

export interface AnchorMessage {
  type: 'anchors';
  anchors: AnchorPosition[];
}

export type WsMessage = PositionMessage | AnchorStatusMessage | AnchorMessage;

export interface AnchorBatteryRecord {
  chip_id: string;
  battery_v: string;
  timestamp: number;
}

export interface TagState {
  chip_id: string;
  x: number | null;
  y: number | null;
  distances: number[];
  battery_v: string;
  timestamp: number | null;
}