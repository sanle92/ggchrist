'use client';

import { RefObject, useEffect } from 'react';

export function useClickOutside<T extends HTMLElement>(ref: RefObject<T | null>, onOutside: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const handlePointer = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onOutside();
    };
    const handleKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onOutside(); };
    document.addEventListener('pointerdown', handlePointer, true);
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('pointerdown', handlePointer, true); document.removeEventListener('keydown', handleKey); };
  }, [enabled, onOutside, ref]);
}
