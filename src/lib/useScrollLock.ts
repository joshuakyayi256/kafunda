"use client";

/**
 * One shared page scroll lock for every overlay (age gate, cart drawer, quick
 * view, search/menu, payment window).
 *
 * Previously each component wrote document.body.style.overflow itself, so
 * one closing could unlock the page while another was still open — or a
 * component resetting to "" could leave it locked. This keeps a COUNT: the
 * page stays locked while any overlay is open and unlocks only when the last
 * one closes. Locks <html> too (iOS Safari ignores a body-only lock) and pads
 * for the scrollbar so desktop content doesn't shift sideways.
 */

import { useEffect } from "react";

let lockCount = 0;
let saved: { html: string; body: string; paddingRight: string } | null = null;

function lock() {
  if (lockCount === 0) {
    const html = document.documentElement;
    const body = document.body;
    saved = {
      html: html.style.overflow,
      body: body.style.overflow,
      paddingRight: body.style.paddingRight,
    };
    const scrollbar = window.innerWidth - html.clientWidth;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
  }
  lockCount += 1;
}

function unlock() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0 && saved) {
    document.documentElement.style.overflow = saved.html;
    document.body.style.overflow = saved.body;
    document.body.style.paddingRight = saved.paddingRight;
    saved = null;
  }
}

/** Lock page scrolling while `active` is true. */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    lock();
    return unlock;
  }, [active]);
}
