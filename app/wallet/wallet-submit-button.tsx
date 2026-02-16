"use client";

import { useFormStatus } from "react-dom";

type WalletSubmitButtonProps = {
  idleLabel: string;
  pendingLabel: string;
  className?: string;
};

export function WalletSubmitButton({
  idleLabel,
  pendingLabel,
  className = "",
}: WalletSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button className={className} disabled={pending} type="submit">
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}
