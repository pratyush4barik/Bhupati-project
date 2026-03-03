"use client";

import { useState } from "react";

type PlanNextButtonProps = {
  disabled?: boolean;
};

export function PlanNextButton({ disabled = false }: PlanNextButtonProps) {
  const [pending, setPending] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  return (
    <div className="flex flex-col items-end gap-1.5">
      {showWarning ? (
        <p className="text-sm text-red-500">Please choose a plan to continue.</p>
      ) : null}
      <button
        className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
        onClick={() => {
          if (disabled) {
            setShowWarning(true);
          } else {
            setPending(true);
          }
        }}
        type={disabled ? "button" : "submit"}
      >
        {pending ? "Next..." : "Next"}
      </button>
    </div>
  );
}
