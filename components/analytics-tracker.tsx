"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function storedId(storage: Storage, key: string) {
  const existing = storage.getItem(key);
  if (existing) return existing;
  const value = crypto.randomUUID();
  storage.setItem(key, value);
  return value;
}

export function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (
      !pathname ||
      pathname.startsWith("/api/") ||
      pathname.startsWith("/giving/") ||
      pathname === "/donate/success"
    )
      return;
    const visitorId = storedId(localStorage, "ggc_visitor_id");
    const sessionId = storedId(sessionStorage, "ggc_session_id");
    const path = `${pathname}${window.location.search}`;
    const payload = {
      sessionId,
      visitorId,
      eventType: "page_view",
      path,
      referrer: document.referrer || null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screenWidth: window.innerWidth,
    };
    void fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
    const heartbeat = window.setInterval(() => {
      void fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          eventType: "heartbeat",
          referrer: null,
        }),
        keepalive: true,
      });
    }, 30_000);
    return () => window.clearInterval(heartbeat);
  }, [pathname]);

  return null;
}
