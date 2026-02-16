"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

const REFRESHABLE_PATHS = [
  "/dashboard",
  "/wallet",
  "/groups",
  "/existing-groups",
  "/deleted-groups",
  "/requests",
  "/notifications",
  "/subscriptions",
  "/settings",
];

const REFRESH_INTERVAL_MS = 5000;
const INTERACTION_PAUSE_MS = 10000;

function shouldRefreshPath(pathname: string) {
  return REFRESHABLE_PATHS.some((path) => pathname.startsWith(path));
}

export function AutoRefresh() {
  const router = useRouter();
  const pathname = usePathname();
  const lastInteractionAtRef = useRef(0);

  useEffect(() => {
    if (!shouldRefreshPath(pathname)) return;

    const markInteraction = () => {
      lastInteractionAtRef.current = Date.now();
    };

    const events: (keyof DocumentEventMap)[] = [
      "input",
      "change",
      "keydown",
      "pointerdown",
      "submit",
    ];
    for (const eventName of events) {
      document.addEventListener(eventName, markInteraction, true);
    }

    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }

      const activeElement = document.activeElement as HTMLElement | null;
      const isEditingNow =
        !!activeElement &&
        (activeElement.matches("input, textarea, select, [contenteditable='true']") ||
          !!activeElement.closest("form"));

      const interactedRecently =
        Date.now() - lastInteractionAtRef.current < INTERACTION_PAUSE_MS;

      if (isEditingNow || interactedRecently) return;

      router.refresh();
    }, REFRESH_INTERVAL_MS);

    return () => {
      clearInterval(timer);
      for (const eventName of events) {
        document.removeEventListener(eventName, markInteraction, true);
      }
    };
  }, [pathname, router]);

  return null;
}
