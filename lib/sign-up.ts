import { authClient } from "@/lib/auth-client";

type SignUpInput = {
  email: string;
  password: string;
  name: string;
  image?: string;
  callbackURL?: string;
};

export async function signUpWithEmail({
  email,
  password,
  name,
  image,
  callbackURL = "/dashboard",
}: SignUpInput) {
  return authClient.signUp.email({
    email,
    password,
    name,
    image,
    callbackURL,
  });
}
