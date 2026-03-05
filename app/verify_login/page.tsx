import { Suspense } from "react";
import VerifyLoginClient from "./verify-login-client";

export default function VerifyLoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen" />}>
      <VerifyLoginClient />
    </Suspense>
  );
}
