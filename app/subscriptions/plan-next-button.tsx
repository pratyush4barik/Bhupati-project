"use client";

import { useState } from "react";

type PlanNextButtonProps = {
  disabled?: boolean;
};

export function PlanNextButton({ disabled = false }: PlanNextButtonProps) {
  const [pending, setPending] = useState(false);

  return (
    <button
      className={
        disabled
          ? "cursor-not-allowed rounded-md bg-black/50 px-4 py-2 text-sm text-white"
          : "rounded-md bg-black px-4 py-2 text-sm text-white"
      }
      disabled={disabled}
      onClick={() => setPending(true)}
      type={disabled ? "button" : "submit"}
    >
      {pending ? "Next..." : "Next"}
    </button>
  );
}
