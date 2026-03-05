"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { IconCheck, IconLockOpen, IconRefresh } from "@tabler/icons-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PinInput } from "@/app/wallet/pin-input";
import { setPinAction } from "@/app/wallet/pin-actions";

export function WalletPinSection({
  hasPin,
  returnTo,
  userEmail,
}: {
  hasPin: boolean;
  returnTo?: string;
  userEmail: string;
}) {
  const [hasPinState, setHasPinState] = useState(hasPin);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [securityCode, setSecurityCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetMessage, setResetMessage] = useState("");

  useEffect(() => {
    setHasPinState(hasPin);
    setShowResetConfirm(false);
    setSecurityCode("");
    setCodeSent(false);
    setSendingCode(false);
    setVerifyingCode(false);
    setResetError("");
    setResetMessage("");
  }, [hasPin]);

  const requestSecurityCode = async () => {
    if (sendingCode) return;
    setSendingCode(true);
    setResetError("");
    setResetMessage("");

    try {
      const response = await fetch("/api/wallet/pin-reset/request", { method: "POST" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setResetError(data.error ?? "Failed to send security code.");
        return;
      }
      setCodeSent(true);
      setSecurityCode("");
      setResetMessage(`Security code sent to ${userEmail}`);
    } catch {
      setResetError("Failed to send security code.");
    } finally {
      setSendingCode(false);
    }
  };

  const verifySecurityCode = async () => {
    if (verifyingCode) return;
    if (securityCode.length !== 6) {
      setResetError("Enter the 6-digit security code.");
      return;
    }

    setVerifyingCode(true);
    setResetError("");
    setResetMessage("");
    try {
      const response = await fetch("/api/wallet/pin-reset/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: securityCode }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setResetError(data.error ?? "Security code verification failed.");
        return;
      }

      setShowResetConfirm(false);
      setHasPinState(false);
      setResetMessage("");
      setSecurityCode("");
      setCodeSent(false);
    } catch {
      setResetError("Security code verification failed.");
    } finally {
      setVerifyingCode(false);
    }
  };

  if (!hasPinState) {
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
        onClick={() => {
          setShowResetConfirm(true);
          setSecurityCode("");
          setCodeSent(false);
          setResetError("");
          setResetMessage("");
        }}
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
            <DialogTitle className="text-center">Verify before PIN reset</DialogTitle>
            <DialogDescription className="text-center">
              We will send a wallet security code to your email. Verify it to continue and set a new PIN.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <p className="text-center text-xs text-muted-foreground">Email: {userEmail}</p>
            {codeSent ? (
              <div className="space-y-3">
                <p className="text-center text-sm font-medium">Enter 6-digit security code</p>
                <PinInput
                  value={securityCode}
                  onChange={setSecurityCode}
                  length={6}
                  disabled={verifyingCode}
                  autoFocus
                />
              </div>
            ) : (
              <div />
            )}
            {resetError ? <p className="text-center text-xs text-red-500">{resetError}</p> : null}
            {resetMessage ? <p className="text-center text-xs text-green-600">{resetMessage}</p> : null}
          </div>

          <DialogFooter className="sm:justify-center">
            <DialogClose asChild>
              <button
                type="button"
                className="rounded-md border px-4 py-2 text-sm transition-colors hover:bg-muted"
                disabled={sendingCode || verifyingCode}
              >
                Cancel
              </button>
            </DialogClose>
            {!codeSent ? (
              <Button
                type="button"
                onClick={requestSecurityCode}
                disabled={sendingCode}
                className="bg-red-600 hover:bg-red-700"
              >
                {sendingCode ? "Sending..." : "Send code"}
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={requestSecurityCode} disabled={sendingCode || verifyingCode}>
                  {sendingCode ? "Resending..." : "Resend"}
                </Button>
                <Button
                  type="button"
                  onClick={verifySecurityCode}
                  disabled={verifyingCode || securityCode.length !== 6}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {verifyingCode ? "Verifying..." : "Verify & reset"}
                </Button>
              </div>
            )}
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
        No PIN set - set your PIN to enable transactions
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
              onClick={() => {
                setStep("set");
                setConfirmPin("");
              }}
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
      {pending ? "Setting..." : "Set PIN"}
    </button>
  );
}
