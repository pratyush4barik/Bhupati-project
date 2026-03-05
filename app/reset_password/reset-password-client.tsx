"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPasswordClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = useMemo(
    () => searchParams.get("email")?.trim().toLowerCase() || "",
    [searchParams],
  );

  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!email) return;
    const storedOtp = sessionStorage.getItem(`reset-otp:${email}`) || "";
    setOtp(storedOtp);
  }, [email]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || !otp || loading) return;

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/auth/email-otp/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          otp,
          password,
        }),
      });

      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(payload?.message || "Unable to reset password.");
        return;
      }

      sessionStorage.removeItem(`reset-otp:${email}`);
      setMessage("Password reset successful. Redirecting to login...");
      setTimeout(() => router.push("/login"), 1200);
    } catch {
      setError("Unable to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!email) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-xl items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
        <p className="text-sm text-muted-foreground">
          Missing email. Start from{" "}
          <Link className="underline" href="/forget_password">
            forgot password
          </Link>
          .
        </p>
      </main>
    );
  }

  if (!otp) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-xl items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
        <p className="text-sm text-muted-foreground">
          OTP is not verified yet. Go to{" "}
          <Link className="underline" href={`/verify_login?email=${encodeURIComponent(email)}`}>
            OTP verification
          </Link>
          .
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-3 rounded-xl border bg-card p-4 shadow-sm sm:max-w-md sm:space-y-4 sm:p-5"
      >
        <h1 className="text-base font-semibold tracking-tight sm:text-lg">Set new password</h1>
        <p className="break-all text-xs text-muted-foreground sm:text-sm">Account: {email}</p>

        <div className="space-y-1">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="confirm-password">Confirm password</Label>
          <Input
            id="confirm-password"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        {error && <p className="text-xs text-red-500 sm:text-sm">{error}</p>}
        {message && <p className="text-xs text-green-600 sm:text-sm">{message}</p>}

        <Button type="submit" className="mt-1 w-full" disabled={loading}>
          {loading ? "Updating..." : "Update password"}
        </Button>
      </form>
    </main>
  );
}
