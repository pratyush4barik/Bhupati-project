"use client";

import { useEffect } from "react";

const STORAGE_KEY = "payxen-checkout-url";

/**
 * Persists the checkout URL (step 4) in localStorage.
 * - On step 4: saves the current URL so the user can return to it.
 * - On step 1 with no explicit step param: redirects to saved checkout URL.
 * - Clears saved URL on payment success or when user navigates to step < 4.
 */
export function CheckoutPersist({
  currentStep,
  hasExplicitStep,
  paymentSuccess,
}: {
  currentStep: number;
  hasExplicitStep: boolean;
  paymentSuccess: boolean;
}) {
  useEffect(() => {
    // Clear on successful payment
    if (paymentSuccess) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    // On step 4, save the full URL
    if (currentStep === 4) {
      localStorage.setItem(STORAGE_KEY, window.location.href);
      return;
    }

    // User explicitly chose a step < 4 (clicked Back, etc.) — clear saved state
    if (hasExplicitStep && currentStep < 4) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    // No explicit step (fresh visit to /subscriptions) — restore checkout if saved
    if (!hasExplicitStep && currentStep === 1) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        window.location.replace(saved);
      }
    }
  }, [currentStep, hasExplicitStep, paymentSuccess]);

  return null;
}
