export type Phase = "setup" | "lobby" | "drawing" | "collage";

export type Guest = {
  id: string;
  name: string;
  token: string;
  drawingDataUrl?: string;
  submittedAt?: number;
  banned?: boolean;
};

export type DrawingTile = {
  guestId: string;
  name: string;
  drawingDataUrl: string;
  submittedAt: number;
};

export type EventData = {
  id: string;
  companyName: string;
  theme: string;
  referencePhoto?: string;
  brushColor: string;
  hostToken: string;
  guestAccessToken: string;
  screenToken: string;
  phase: Phase;
  roundEndsAt: number | null;
  roundSeconds: number;
  guests: Guest[];
  createdAt: number;
  updatedAt: number;
};

export type PublicState = {
  id: string;
  companyName: string;
  theme: string;
  referencePhoto?: string;
  brushColor: string;
  palette: string[];
  phase: Phase;
  roundSeconds: number;
  secondsLeft: number | null;
  guestCount: number;
  drawings: DrawingTile[];
  role: "host" | "guest" | "screen";
  me?: { guestId: string; name: string; submitted: boolean; banned: boolean };
  joinPath?: string;
  screenPath?: string;
  guestAccessToken?: string;
};

export const DEFAULT_PALETTE = [
  "#FF2D6A",
  "#2EE6D6",
  "#D4FF3A",
  "#1A1A1A",
  "#FF8A3D",
  "#6B5CFF",
  "#FFFFFF",
  "#3D7EFF",
];
