import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AutoRefresh } from "@/app/auto-refresh";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ServiceWorkerRegistrar } from "@/app/sw-register";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PayXen",
  description: "PayXen – Smart Payment Management",
  manifest: "/manifest.json",
  themeColor: "#18181b",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <TooltipProvider>
          <AutoRefresh />
          {children}
        </TooltipProvider>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
