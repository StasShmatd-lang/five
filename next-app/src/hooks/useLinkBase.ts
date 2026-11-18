"use client";

import { useEffect, useState } from "react";
import { readJson } from "@/lib/apiClient";

export function useLinkBase() {
  const [base, setBase] = useState("");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/link-base");
        const data = await readJson<{ base?: string }>(res);
        if (!cancelled && data.base) setBase(data.base.replace(/\/$/, ""));
        else if (!cancelled) setBase(window.location.origin);
      } catch {
        if (!cancelled) setBase(window.location.origin);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return base || (typeof window !== "undefined" ? window.location.origin : "");
}
