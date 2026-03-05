This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Render

This repo includes a Render Blueprint file at `render.yaml`.

### Option 1: Blueprint deploy (recommended)

1. Push this repo to GitHub/GitLab.
2. In Render, choose **New +** -> **Blueprint**.
3. Select the repo and deploy.
4. In the Render dashboard, set these required environment variables:
   - `BETTER_AUTH_URL` (set to your Render app URL, e.g. `https://your-app.onrender.com`)
   - `NEXT_PUBLIC_BETTER_AUTH_URL` (same value as above)
   - `BETTER_AUTH_SECRET`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `DATABASE_URL`
   - `MONITOR_JWT_SECRET`
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL`

### Option 2: Manual Web Service

If you do not use the blueprint, configure:

- Runtime: `Node`
- Build Command: `npm ci && npm run build -- --webpack`
- Start Command: `npm run start`
- Node Version: `20`
