import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins";
import { Resend } from "resend";
import { db } from "@/db";
import * as schema from "@/db/schema";

const resendApiKey = process.env.RESEND_API_KEY;
const resendFromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

const resend = resendApiKey ? new Resend(resendApiKey) : null;

export const auth = betterAuth({
    baseURL: process.env.BETTER_AUTH_URL,
    database: drizzleAdapter(db, {
        provider: "pg",
        schema,
        camelCase: true,
    }),
    emailAndPassword: {
        enabled: true,
    },
    trustedOrigins: [
        process.env.BETTER_AUTH_URL,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ].filter(Boolean) as string[],
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        },
    },
    plugins: [
        emailOTP({
            storeOTP: "hashed",
            expiresIn: 5 * 60,
            allowedAttempts: 3,
            async sendVerificationOTP({ email, otp, type }) {
                if (!resend) {
                    throw new Error("RESEND_API_KEY is not configured.");
                }

                const purpose =
                    type === "forget-password"
                        ? "password reset"
                        : type === "email-verification"
                          ? "email verification"
                          : "sign in";

                const subject = `Your PayXen ${purpose} code`;
                const text = `Your PayXen ${purpose} OTP is ${otp}. It expires in 5 minutes.`;

                await resend.emails.send({
                    from: resendFromEmail,
                    to: email,
                    subject,
                    text,
                    html: `<p>Your PayXen ${purpose} OTP is <strong>${otp}</strong>.</p><p>This code expires in 5 minutes.</p>`,
                });
            },
        }),
    ],
});
