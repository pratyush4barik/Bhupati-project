import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * GET /api/monitor/provision/google-start
 *
 * A GET endpoint the Electron popup navigates to.
 * Internally POSTs to Better Auth's social sign-in to get the Google OAuth URL,
 * then 302-redirects the browser there — **forwarding all Set-Cookie headers**
 * so Better Auth can later read back the OAuth state & callbackURL.
 */
export async function GET(request: NextRequest) {
  const callbackURL =
    request.nextUrl.searchParams.get("callbackURL") ??
    new URL("/api/monitor/provision/google-callback", request.nextUrl.origin).toString();

  /* Call Better Auth's sign-in/social endpoint internally as POST */
  const signInUrl = new URL("/api/auth/sign-in/social", request.nextUrl.origin);

  const internalReq = new Request(signInUrl.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      provider: "google",
      callbackURL,
    }),
  });

  const response = await auth.handler(internalReq);

  /* Extract the redirect URL — could be a 302 Location or JSON { url } */
  let redirectUrl: string | null = response.headers.get("location");

  if (!redirectUrl) {
    try {
      const cloned = response.clone();
      const data = (await cloned.json()) as { url?: string };
      redirectUrl = data?.url ?? null;
    } catch {
      /* ignore */
    }
  }

  if (!redirectUrl) {
    return NextResponse.json({ error: "Failed to initiate Google OAuth" }, { status: 502 });
  }

  /* Build redirect response and FORWARD every Set-Cookie from Better Auth.
     These cookies carry the PKCE code-verifier, state, and callbackURL
     that Better Auth needs when Google redirects back. */
  const res = NextResponse.redirect(redirectUrl);

  const setCookies = response.headers.getSetCookie?.()
    ?? (response.headers as unknown as { raw?: () => Record<string, string[]> })
        .raw?.()?.["set-cookie"]
    ?? [];

  for (const cookie of setCookies) {
    res.headers.append("set-cookie", cookie);
  }

  return res;
}
