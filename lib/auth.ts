import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import * as schema from "@/db/schema";

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
});
