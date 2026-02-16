"use client";

import { useState } from "react";
import { IconCopy, IconEye, IconEyeOff } from "@tabler/icons-react";

type GroupCredentialsProps = {
  email: string | null;
  password: string | null;
};

export function GroupCredentials({ email, password }: GroupCredentialsProps) {
  const [showPassword, setShowPassword] = useState(false);

  const copyEmail = async () => {
    if (!email) return;
    try {
      await navigator.clipboard.writeText(email);
    } catch {
      // Ignore clipboard failures for non-secure environments.
    }
  };

  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">App email</p>
      <div className="mt-1 flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium">{email ?? "Not available"}</p>
        <button
          className="rounded-md border p-1.5 hover:bg-muted"
          onClick={copyEmail}
          type="button"
        >
          <IconCopy className="h-4 w-4" />
        </button>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">Password</p>
      <div className="mt-1 flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium">
          {showPassword ? (password ?? "Not available") : "********"}
        </p>
        <button
          className="rounded-md border p-1.5 hover:bg-muted"
          onClick={() => setShowPassword((prev) => !prev)}
          type="button"
        >
          {showPassword ? <IconEyeOff className="h-4 w-4" /> : <IconEye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
