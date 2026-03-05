"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";

export default function VerifyLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = useMemo(
    () => searchParams.get("email")?.trim().toLowerCase() || "",
    [searchParams],
  );

  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleVerify = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || otp.length !== 6 || isVerifying) return;

    setIsVerifying(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/auth/email-otp/check-verification-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          otp,
          type: "forget-password",
        }),
      });

      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(payload?.message || "Invalid OTP.");
        return;
      }

      sessionStorage.setItem(`reset-otp:${email}`, otp);
      router.push(`/reset_password?email=${encodeURIComponent(email)}`);
    } catch {
      setError("Failed to verify OTP. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!email || isResending) return;

    setIsResending(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/auth/email-otp/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(payload?.message || "Could not resend OTP.");
        return;
      }
      setMessage("A new OTP has been sent.");
    } catch {
      setError("Could not resend OTP. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-3 py-6 sm:px-6 sm:py-10">
      <Card className="mx-auto w-full max-w-md">
        <CardHeader className="gap-2 sm:gap-3">
          <CardTitle className="text-xl sm:text-2xl">Verify your OTP</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Enter the 6-digit code sent to{" "}
            <span className="break-all font-medium">{email || "your email"}</span>.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleVerify}>
          <CardContent className="px-4 pb-5 sm:px-6 sm:pb-6">
            <Field>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <FieldLabel htmlFor="otp-verification">Verification code</FieldLabel>
                <Button
                  variant="outline"
                  size="xs"
                  type="button"
                  onClick={handleResend}
                  disabled={!email || isResending}
                >
                  <RefreshCwIcon className={isResending ? "animate-spin" : ""} />
                  {isResending ? "Resending..." : "Resend Code"}
                </Button>
              </div>
                <InputOTP
                  maxLength={6}
                  id="otp-verification"
                  value={otp}
                  onChange={setOtp}
                  containerClassName="justify-center"
                  required
                >
                <InputOTPGroup className="*:data-[slot=input-otp-slot]:h-10 *:data-[slot=input-otp-slot]:w-8 *:data-[slot=input-otp-slot]:text-base sm:*:data-[slot=input-otp-slot]:h-12 sm:*:data-[slot=input-otp-slot]:w-11 sm:*:data-[slot=input-otp-slot]:text-xl">
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                </InputOTPGroup>
                <InputOTPSeparator className="mx-1 sm:mx-2" />
                <InputOTPGroup className="*:data-[slot=input-otp-slot]:h-10 *:data-[slot=input-otp-slot]:w-8 *:data-[slot=input-otp-slot]:text-base sm:*:data-[slot=input-otp-slot]:h-12 sm:*:data-[slot=input-otp-slot]:w-11 sm:*:data-[slot=input-otp-slot]:text-xl">
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
              <FieldDescription>
                <Link href="/forget_password">Wrong email? Go back.</Link>
              </FieldDescription>
            </Field>
            {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
            {message && <p className="mt-3 text-sm text-green-600">{message}</p>}
          </CardContent>
          <CardFooter>
            <Field>
              <Button type="submit" className="w-full" disabled={!email || otp.length !== 6 || isVerifying}>
                {isVerifying ? "Verifying..." : "Verify OTP"}
              </Button>
            </Field>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
