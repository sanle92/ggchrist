"use client";

import { useEffect, useState } from "react";
import { ListTree } from "lucide-react";

type TrackerItem = {
  id: string;
  label: string;
  level: number;
};

function headingId(label: string, index: number) {
  const slug = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  return slug || `section-${index + 1}`;
}

export function ContentTracker({
  rootId,
  label = "On this page",
}: {
  rootId: string;
  label?: string;
}) {
  const [items, setItems] = useState<TrackerItem[]>([]);
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    const root = document.getElementById(rootId);
    if (!root) return;

    const headings = Array.from(
      root.querySelectorAll<HTMLElement>("h1, h2, h3"),
    );
    const usedIds = new Set<string>();
    const trackerItems = headings.map((heading, index) => {
      const baseId = heading.id || headingId(heading.textContent || "", index);
      let id = baseId;
      let duplicate = 2;
      while (usedIds.has(id)) id = `${baseId}-${duplicate++}`;
      usedIds.add(id);
      heading.id = id;
      heading.style.scrollMarginTop = "7rem";
      return {
        id,
        label: heading.textContent?.trim() || `Section ${index + 1}`,
        level: Number(heading.tagName.slice(1)),
      };
    });

    setItems(trackerItems);
    setActiveId(trackerItems[0]?.id || "");

    const updateActiveHeading = () => {
      const threshold = 145;
      let current = headings[0]?.id || "";
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top <= threshold) {
          current = heading.id;
        } else {
          break;
        }
      }
      setActiveId(current);
    };

    updateActiveHeading();
    window.addEventListener("scroll", updateActiveHeading, { passive: true });
    window.addEventListener("resize", updateActiveHeading);
    return () => {
      window.removeEventListener("scroll", updateActiveHeading);
      window.removeEventListener("resize", updateActiveHeading);
    };
  }, [rootId]);

  if (!items.length) {
    return (
      <nav className="border border-border bg-surface p-6" aria-label={label}>
        <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.17em] text-forest">
          <ListTree size={16} className="text-amber" /> {label}
        </h2>
        <p className="mt-4 text-sm leading-6 text-ink3">
          Add headings to this content to generate its navigation.
        </p>
      </nav>
    );
  }

  return (
    <nav className="border border-border bg-surface p-6" aria-label={label}>
      <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.17em] text-forest">
        <ListTree size={16} className="text-amber" /> {label}
      </h2>
      <ol className="mt-5 border-l border-border">
        {items.map((item, index) => {
          const active = item.id === activeId;
          return (
            <li key={item.id} className={item.level === 3 ? "pl-3" : ""}>
              <a
                href={`#${item.id}`}
                aria-current={active ? "location" : undefined}
                className={`group -ml-px flex gap-3 border-l-2 py-2.5 pl-4 pr-2 text-sm leading-5 transition ${
                  active
                    ? "border-amber font-semibold text-forest"
                    : "border-transparent text-ink3 hover:border-border hover:text-forest"
                }`}
              >
                <span
                  className={`text-[.65rem] tabular-nums ${active ? "text-amber" : "text-ink3/55"}`}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>{item.label}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
