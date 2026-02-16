"use client";

import { useFormStatus } from "react-dom";

export function CheckoutSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? "Paying..." : "Pay using PayXen"}
    </button>
  );
}
