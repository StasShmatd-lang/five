export type Phase = "setup" | "lobby" | "drawing" | "collage";

export type Guest = {
  id: string;
  name: string;
  token: string;
  drawingDataUrl?: string;
  submittedAt?: number;
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
  phase: Phase;
  roundSeconds: number;
  secondsLeft: number | null;
  guestCount: number;
  drawings: DrawingTile[];
  role: "host" | "guest" | "screen";
  me?: { guestId: string; name: string; submitted: boolean };
  joinPath?: string;
  screenPath?: string;
  guestAccessToken?: string;
};
