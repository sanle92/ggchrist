"use client";

import { useEffect, useState } from 'react';
import { Eye } from 'lucide-react';

const numberFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

export function ContentViewCounter({
  contentType,
  contentId,
  initialViews,
  noun = 'views',
}: {
  contentType: 'article' | 'teaching';
  contentId: string;
  initialViews: number;
  noun?: string;
}) {
  const [views, setViews] = useState(Number(initialViews || 0));

  useEffect(() => {
    const countedKey = `ggc-view:${contentType}:${contentId}`;
    if (sessionStorage.getItem(countedKey)) return;
    let viewerKey = sessionStorage.getItem('ggc-viewer-session');
    if (!viewerKey) {
      viewerKey = crypto.randomUUID();
      sessionStorage.setItem('ggc-viewer-session', viewerKey);
    }
    fetch('/api/views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentType, contentId, viewerKey }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('View could not be recorded');
        return response.json() as Promise<{ views: number }>;
      })
      .then((result) => {
        setViews(Number(result.views || 0));
        sessionStorage.setItem(countedKey, '1');
      })
      .catch(() => undefined);
  }, [contentId, contentType]);

  return (
    <span className="inline-flex items-center gap-1.5">
      <Eye size={15} className="text-amber" /> {numberFormatter.format(views)} {noun}
    </span>
  );
}
