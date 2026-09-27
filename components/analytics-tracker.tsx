"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const fallbackIds = new Map<string, string>();

function storedId(storageName: "localStorage" | "sessionStorage", key: string) {
  try {
    const storage = window[storageName];
    const existing = storage.getItem(key);
    if (existing) return existing;
    const value = crypto.randomUUID();
    storage.setItem(key, value);
    return value;
  } catch {
    const value = fallbackIds.get(key) || crypto.randomUUID();
    fallbackIds.set(key, value);
    return value;
  }
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
    const visitorId = storedId("localStorage", "ggc_visitor_id");
    const sessionId = storedId("sessionStorage", "ggc_session_id");
    const path = pathname;
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
    }).catch(() => undefined);
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
      }).catch(() => undefined);
    }, 30_000);
    return () => window.clearInterval(heartbeat);
  }, [pathname]);

  return null;
}
