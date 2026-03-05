import type React from "react";
import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { AppSidebar } from "@/app/dashboard-01/app-sidebar";
import { SiteHeader } from "@/app/dashboard-01/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { requireSession } from "@/lib/require-session";
import { MonitorControls } from "@/app/payxen-monitor/monitor-controls";
import { PwaInstallSection } from "@/app/payxen-monitor/pwa-install-section";
import { InstallWebAppButton } from "@/app/payxen-monitor/install-web-app-button";

const installationSteps = [
  "Download the Windows installer.",
  "Run the installer and enable auto-start if you want always-on tracking.",
  "Open PayXen Monitor and review Terms and Privacy consent screens.",
  "Generate monitor token on this page and paste it in the desktop app.",
  "Keep tracking enabled; data syncs every 60 seconds over HTTPS.",
];

const systemRequirements = [
  "Windows 10 or later (64-bit)",
  "4 GB RAM minimum",
  "Internet access for secure sync",
  "Active PayXen account",
];

export default async function PayXenMonitorPage() {
  const session = await requireSession();
  const installerPath = path.join(process.cwd(), "public", "downloads", "PayXen-Monitor-Setup.exe");
  const installerAvailable = fs.existsSync(installerPath);

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 60)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar
        user={{
          name: session.user.name ?? "User",
          email: session.user.email,
          image: session.user.image ?? null,
        }}
        variant="inset"
      />
      <SidebarInset>
        <SiteHeader title="PayXen Monitor" />
        <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 px-4 py-6 sm:gap-6 sm:px-6 sm:py-8">
          <section className="rounded-2xl border bg-gradient-to-br from-zinc-900 to-zinc-800 p-4 text-white shadow-sm sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-300">Desktop Tracking</p>
            <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">PayXen Monitor</h1>
            <p className="mt-3 max-w-3xl text-sm text-zinc-200">
              A transparent desktop companion that tracks focused time for selected subscription services only.
              No browsing history, no personal account content, and no page-level surveillance.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {installerAvailable ? (
                <a
                  href="/downloads/PayXen-Monitor-Setup.exe"
                  className="inline-flex rounded-md bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-200"
                >
                  Download Windows Installer (.exe)
                </a>
              ) : (
                <span className="inline-flex rounded-md border border-zinc-500 px-4 py-2 text-sm font-medium text-zinc-300">
                  Installer not published yet
                </span>
              )}
              <Link
                href="/privacy-policy"
                className="inline-flex rounded-md border border-zinc-500 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms-and-conditions"
                className="inline-flex rounded-md border border-zinc-500 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
              >
                Terms and Conditions
              </Link>
              <InstallWebAppButton />
            </div>
          </section>

          <MonitorControls />

          <PwaInstallSection />

          <section className="grid gap-4 sm:gap-6 md:grid-cols-2">
            <article className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
              <h2 className="text-lg font-semibold">Installation Guide</h2>
              <ol className="mt-4 space-y-2 text-sm text-muted-foreground">
                {installationSteps.map((step, index) => (
                  <li key={step} className="rounded-lg border bg-muted/20 px-3 py-2">
                    <span className="font-medium text-foreground">{index + 1}.</span> {step}
                  </li>
                ))}
              </ol>
            </article>
            <article className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
              <h2 className="text-lg font-semibold">System Requirements</h2>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {systemRequirements.map((item) => (
                  <li key={item} className="rounded-lg border bg-muted/20 px-3 py-2">
                    {item}
                  </li>
                ))}
              </ul>
              <h3 className="mt-6 text-base font-semibold">Transparency Summary</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>Tracks only focused window time for supported services.</li>
                <li>Does not store browsing history or page URLs.</li>
                <li>Does not access account credentials or watched/listened content.</li>
                <li>Local encrypted queue is used for offline sync safety.</li>
                <li>Data retention is limited to 180 days unless deleted earlier.</li>
              </ul>
            </article>
          </section>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}


