"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

type SignOutButtonProps = {
  className?: string;
  compact?: boolean;
};

export function SignOutButton({ className, compact = false }: SignOutButtonProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.replace("/login");
  };

  return (
    <Button
      type="button"
      variant="outline"
      size={compact ? "sm" : "default"}
      className={cn(className)}
      onClick={handleSignOut}
    >
      Sign out
    </Button>
  );
}
