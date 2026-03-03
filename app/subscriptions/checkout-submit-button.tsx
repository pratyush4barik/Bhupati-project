"use client";

import { useFormStatus } from "react-dom";

export function CheckoutSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? "Paying..." : "Pay using PayXen"}
    </button>
  );
}
