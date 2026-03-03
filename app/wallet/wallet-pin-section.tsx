"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { IconLock, IconLockOpen, IconCheck, IconRefresh } from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { PinInput } from "@/app/wallet/pin-input";
import { setPinAction, resetPinAction } from "@/app/wallet/pin-actions";

export function WalletPinSection({ hasPin, returnTo }: { hasPin: boolean; returnTo?: string }) {
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Close the reset dialog whenever hasPin changes (e.g. after reset completes)
  useEffect(() => {
    setShowResetConfirm(false);
  }, [hasPin]);

  if (!hasPin) {
    return <SetPinForm returnTo={returnTo} />;
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 rounded-lg border border-green-800 bg-green-950/50 px-3 py-1.5 text-xs font-medium text-green-400">
        <IconCheck className="h-3.5 w-3.5" />
        PIN set
      </div>
      <button
        type="button"
        onClick={() => setShowResetConfirm(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <IconRefresh className="h-3.5 w-3.5" />
        Reset PIN
      </button>

      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-red-800 bg-red-950">
              <IconLockOpen className="h-6 w-6 text-red-400" />
            </div>
            <DialogTitle className="text-center">Reset PIN</DialogTitle>
            <DialogDescription className="text-center">
              This will remove your current PIN. You will need to set a new one before making any transactions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <DialogClose asChild>
              <button
                type="button"
                className="rounded-md border px-4 py-2 text-sm transition-colors hover:bg-muted"
              >
                Cancel
              </button>
            </DialogClose>
            <form action={resetPinAction}>
              <ResetPinButton />
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SetPinForm({ returnTo }: { returnTo?: string }) {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [step, setStep] = useState<"set" | "confirm">("set");

  const pinsMatch = pin === confirmPin;
  const canSubmit = pin.length === 4 && confirmPin.length === 4 && pinsMatch;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-lg border border-yellow-800 bg-yellow-950/50 px-3 py-1.5 text-xs font-medium text-yellow-400">
        <IconLockOpen className="h-3.5 w-3.5" />
        No PIN set — set your PIN to enable transactions
      </div>

      {step === "set" ? (
        <div className="space-y-3">
          <p className="text-center text-sm font-medium">Set PIN</p>
          <PinInput value={pin} onChange={setPin} autoFocus />
          <button
            type="button"
            onClick={() => setStep("confirm")}
            disabled={pin.length !== 4}
            className="mx-auto block rounded-lg bg-violet-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-center text-sm font-medium">Confirm PIN</p>
          <PinInput value={confirmPin} onChange={setConfirmPin} autoFocus />
          {confirmPin.length === 4 && !pinsMatch && (
            <p className="text-center text-xs text-red-500">PINs do not match</p>
          )}
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={() => { setStep("set"); setConfirmPin(""); }}
              className="rounded-lg border px-4 py-2 text-sm transition-colors hover:bg-muted"
            >
              Back
            </button>
            <form action={setPinAction}>
              <input type="hidden" name="pin" value={pin} />
              <input type="hidden" name="confirmPin" value={confirmPin} />
              {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
              <SetPinButton disabled={!canSubmit} />
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function SetPinButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="rounded-lg bg-violet-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
    >
      {pending ? "Setting…" : "Set PIN"}
    </button>
  );
}

function ResetPinButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
    >
      {pending ? "Resetting…" : "Confirm Reset"}
    </button>
  );
}
