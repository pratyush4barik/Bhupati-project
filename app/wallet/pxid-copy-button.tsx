"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

type PxIdCopyButtonProps = {
  pxId: string;
};

export function PxIdCopyButton({ pxId }: PxIdCopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pxId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      onClick={handleCopy}
      title={copied ? "Copied" : "Copy px-id"}
      aria-label={copied ? "Copied" : "Copy px-id"}
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
    </Button>
  );
}
