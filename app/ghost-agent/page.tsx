import type React from "react";
import { AppSidebar } from "@/app/dashboard-01/app-sidebar";
import { SiteHeader } from "@/app/dashboard-01/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { requireSession } from "@/lib/require-session";
import { GhostAgentDashboard } from "./_components/ghost-agent-dashboard";

export default async function GhostAgentPage() {
  const session = await requireSession();

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
        }}
        variant="inset"
      />
      <SidebarInset>
        <SiteHeader title="Ghost Agent" />
        <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-4 px-4 py-6 sm:gap-6 sm:px-6 sm:py-8">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Ghost Agent</h1>
            <p className="text-sm text-muted-foreground">
              Automatically manage your subscriptions — cancel unused plans and free trials before you get charged.
            </p>
          </div>
          <GhostAgentDashboard />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
