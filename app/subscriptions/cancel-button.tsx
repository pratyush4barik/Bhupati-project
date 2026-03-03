"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { IconAlertTriangle } from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { cancelSubscriptionAction } from "@/app/subscriptions/actions";

export function CancelSubscriptionButton({
  subscriptionId,
  serviceName,
}: {
  subscriptionId: string;
  serviceName: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-red-800 px-3 py-1 text-xs text-red-400 transition-colors hover:border-red-600 hover:bg-red-950 hover:text-red-300"
      >
        Cancel subscription
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-red-800 bg-red-950">
              <IconAlertTriangle className="h-6 w-6 text-red-400" />
            </div>
            <DialogTitle className="text-center">Cancel Subscription</DialogTitle>
            <DialogDescription className="text-center">
              Are you sure you want to cancel <span className="font-medium text-foreground">{serviceName}</span>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <DialogClose asChild>
              <button
                type="button"
                className="rounded-md border px-4 py-2 text-sm transition-colors hover:bg-muted"
              >
                Keep subscription
              </button>
            </DialogClose>
            <form action={cancelSubscriptionAction}>
              <input name="subscriptionId" type="hidden" value={subscriptionId} />
              <ConfirmCancelButton />
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ConfirmCancelButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
    >
      {pending ? "Cancelling…" : "Confirm cancellation"}
    </button>
  );
}
