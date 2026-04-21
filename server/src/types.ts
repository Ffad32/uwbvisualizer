export interface AnchorPosition {
  x: number;
  y: number;
}

export interface TagPayload {
  chip_id: string;
  role?: 'tag';
  anchor_distances: (number | string)[];
  battery_v: number | string;
}

export interface AnchorPayload {
  chip_id: string;
  role: 'anchor';
  anchor_number: 1 | 2 | 3;
  battery_v: number | string;
}

export type StatusPayload = TagPayload | AnchorPayload;

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

export interface AnchorBatteryRecord {
  chip_id: string;
  battery_v: string;
  timestamp: number;
}

export type WsMessage = PositionMessage | AnchorStatusMessage;