import { authClient } from "@/lib/auth-client";

type SignInInput = {
  email: string;
  password: string;
  callbackURL?: string;
  rememberMe?: boolean;
};

export async function signInWithEmail({
  email,
  password,
  callbackURL = "/dashboard",
  rememberMe = false,
}: SignInInput) {
  return authClient.signIn.email({
    email,
    password,
    callbackURL,
    rememberMe,
  });
}
