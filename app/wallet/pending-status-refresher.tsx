"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type PendingStatusRefresherProps = {
  shouldRefresh: boolean;
};

export function PendingStatusRefresher({
  shouldRefresh,
}: PendingStatusRefresherProps) {
  const router = useRouter();

  useEffect(() => {
    if (!shouldRefresh) return;
    const timer = setTimeout(() => {
      router.refresh();
    }, 5000);
    return () => clearTimeout(timer);
  }, [shouldRefresh, router]);

  return null;
}
