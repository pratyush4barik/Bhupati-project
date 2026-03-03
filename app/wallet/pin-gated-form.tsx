"use client";

import { useState } from "react";
import { IconCheck, IconCurrencyRupee, IconLock, IconLockOpen } from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PinInput } from "@/app/wallet/pin-input";
import { verifyPinAction } from "@/app/wallet/pin-actions";

type PinGatedFormProps = {
  hasPin: boolean;
  children: React.ReactNode;
  action: (formData: FormData) => void | Promise<void>;
  className?: string;
  showPayingAnimation?: boolean;
};

/**
 * Wraps a payment form. On submit, if PIN is set, opens a PIN dialog first.
 * If PIN is not set, shows a dialog prompting to set PIN.
 */
export function PinGatedForm({
  hasPin,
  children,
  action,
  className,
  showPayingAnimation = true,
}: PinGatedFormProps) {
  const [open, setOpen] = useState(false);
  const [noPinOpen, setNoPinOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!hasPin) {
      e.preventDefault();
      setNoPinOpen(true);
      return;
    }

    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPendingFormData(fd);
    setPin("");
    setError("");
    setOpen(true);
  };

  const handleVerify = async () => {
    if (pin.length !== 4) {
      setError("Enter 4-digit PIN");
      return;
    }

    setVerifying(true);
    setError("");

    try {
      const fd = new FormData();
      fd.set("pin", pin);
      const result = await verifyPinAction(fd);

      if (!result.success) {
        setError(result.error || "Incorrect PIN");
        setPin("");
        setVerifying(false);
        return;
      }

      // PIN verified — show paying animation then submit
      setOpen(false);

      if (showPayingAnimation) {
        setPaying(true);
        await new Promise((r) => setTimeout(r, 1800));
      }

      if (pendingFormData) {
        try {
          await action(pendingFormData);
        } finally {
          setPaying(false);
        }
      } else {
        setPaying(false);
      }
    } catch {
      setError("Verification failed");
      setVerifying(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className={className}>
        {children}
      </form>

      <Dialog open={open} onOpenChange={(v) => { if (!verifying) { setOpen(v); setPin(""); setError(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-violet-800 bg-violet-950">
              <IconLock className="h-6 w-6 text-violet-400" />
            </div>
            <DialogTitle className="text-center">Enter PIN</DialogTitle>
            <DialogDescription className="text-center">
              Enter your 4-digit wallet PIN to confirm this transaction.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4 py-2" onSubmit={(e) => { e.preventDefault(); handleVerify(); }}>
            <PinInput value={pin} onChange={setPin} autoFocus disabled={verifying} />

            {error && (
              <p className="text-center text-sm text-red-500">{error}</p>
            )}

            <button
              type="submit"
              disabled={verifying || pin.length !== 4}
              className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
            >
              {verifying ? "Verifying…" : "Confirm"}
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Paying animation overlay */}
      <Dialog open={paying}>
        <DialogContent className="sm:max-w-xs [&>button]:hidden" onInteractOutside={(e) => e.preventDefault()}>
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="relative flex h-16 w-16 items-center justify-center">
              {/* Spinning ring */}
              <span className="absolute inset-0 animate-spin rounded-full border-4 border-green-200 border-t-green-500" />
              {/* Centre icon */}
              <IconCurrencyRupee className="h-7 w-7 text-green-500" />
            </div>
            <p className="text-sm font-medium">Processing payment…</p>
            <p className="text-xs text-muted-foreground">Please wait, do not close this page.</p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={noPinOpen} onOpenChange={setNoPinOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-amber-800 bg-amber-950">
              <IconLockOpen className="h-6 w-6 text-amber-400" />
            </div>
            <DialogTitle className="text-center">PIN Not Set</DialogTitle>
            <DialogDescription className="text-center">
              You need to set a 4-digit wallet PIN before making any transactions.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <button
              type="button"
              onClick={() => {
                const returnTo = encodeURIComponent(window.location.href);
                window.location.href = `/wallet?setPin=1&returnTo=${returnTo}`;
              }}
              className="block w-full rounded-lg bg-amber-600 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-amber-700"
            >
              Go to Wallet &amp; Set PIN
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
