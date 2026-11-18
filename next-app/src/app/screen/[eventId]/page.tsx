"use client";

import { ScreenInner } from "./ScreenInner";

export default function ScreenPage({ params }: { params: Promise<{ eventId: string }> }) {
  return <ScreenInner params={params} />;
}
