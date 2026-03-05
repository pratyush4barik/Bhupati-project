"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  IconActivity,
  IconBell,
  IconChevronDown,
  IconCreditCard,
  IconDashboard,
  IconDeviceDesktop,
  IconGhost,
  IconListDetails,
  IconMail,
  IconSettings,
  IconStack2,
  IconUsers,
} from "@tabler/icons-react"

import { SignOutButton } from "@/components/ui/app_components/sign_out_button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user?: {
    name: string
    email: string
  }
}

function SidebarCountBadge({ count }: { count: number }) {
  return (
    <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full border border-zinc-700 bg-white px-1.5 py-0.5 text-[10px] font-semibold leading-none text-zinc-900 shadow-sm ring-1 ring-zinc-600/70">
      {count > 99 ? "99+" : count}
    </span>
  )
}

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: IconDashboard },
  { title: "Wallet", url: "/wallet", icon: IconCreditCard },
  {
    title: "Groups",
    icon: IconStack2,
    children: [
      { title: "Create Groups", url: "/groups" },
      { title: "Existing Groups", url: "/existing-groups" },
      { title: "Deleted Groups", url: "/deleted-groups" },
    ],
  },
  { title: "Subscriptions", url: "/subscriptions", icon: IconListDetails },
  { title: "Usage", url: "/usage", icon: IconActivity },
  { title: "Requests", url: "/requests", icon: IconMail },
  { title: "Notifications", url: "/notifications", icon: IconBell },
  { title: "Ghost Agent", url: "/ghost-agent", icon: IconGhost },
  { title: "PayXen Monitor", url: "/payxen-monitor", icon: IconDeviceDesktop },
  { title: "Settings", url: "/settings", icon: IconSettings },
]

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const [groupsOpen, setGroupsOpen] = useState(false)
  const [requestsCount, setRequestsCount] = useState<number | null>(null)
  const [notificationsCount, setNotificationsCount] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    const loadCount = async () => {
      try {
        const [requestsResponse, notificationsResponse] = await Promise.all([
          fetch("/api/requests/count", { cache: "no-store" }),
          fetch("/api/notifications/count", { cache: "no-store" }),
        ])

        if (!requestsResponse.ok || !notificationsResponse.ok) return

        const requestsData = (await requestsResponse.json()) as { count?: number }
        const notificationsData = (await notificationsResponse.json()) as { count?: number }
        if (!active) return
        setRequestsCount(
          Number.isFinite(requestsData.count) ? (requestsData.count ?? 0) : 0,
        )
        setNotificationsCount(
          Number.isFinite(notificationsData.count)
            ? (notificationsData.count ?? 0)
            : 0,
        )
      } catch {
        // Keep sidebar functional even if count fetch fails.
      }
    }
    loadCount()
    return () => {
      active = false
    }
  }, [])

  const resolvedUser = user ?? {
    name: "User",
    email: "user@example.com",
  }
  const initials = resolvedUser.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/dashboard">
                <IconDashboard className="!size-5" />
                <span className="text-base font-semibold">PayXen</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  {item.children ? (
                    <>
                      <SidebarMenuButton
                        onClick={() => setGroupsOpen((prev) => !prev)}
                        tooltip={item.title}
                        type="button"
                      >
                        <item.icon />
                        <span>{item.title}</span>
                        <IconChevronDown
                          className={`ml-auto size-4 transition-transform duration-300 ${groupsOpen ? "rotate-180" : "rotate-0"}`}
                        />
                      </SidebarMenuButton>
                      <div
                        className={`ml-6 overflow-hidden transition-all duration-300 ease-in-out ${
                          groupsOpen ? "mt-1 max-h-40 opacity-100" : "mt-0 max-h-0 opacity-0"
                        }`}
                      >
                        <div className="space-y-1">
                        {item.children.map((child) => (
                          <SidebarMenuButton asChild key={child.title} tooltip={child.title}>
                            <Link href={child.url}>
                              <IconUsers />
                              <span className="text-sm">{child.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                        {item.url === "/requests" && requestsCount !== null && requestsCount > 0 ? (
                          <SidebarCountBadge count={requestsCount} />
                        ) : null}
                        {item.url === "/notifications" &&
                        notificationsCount !== null &&
                        notificationsCount > 0 ? (
                          <SidebarCountBadge count={notificationsCount} />
                        ) : null}
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="p-2">
          <div className="flex items-center justify-between gap-2 rounded-md border p-2 text-xs">
            <div className="flex min-w-0 items-center gap-2">
              <Avatar className="h-8 w-8 rounded-full border">
                <AvatarFallback className="rounded-full text-[10px] font-semibold">
                  {initials || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-medium leading-tight">{resolvedUser.name}</p>
                <p className="text-muted-foreground truncate text-[11px] leading-tight">{resolvedUser.email}</p>
              </div>
            </div>
            <SignOutButton compact className="h-7 shrink-0 px-2 text-[11px]" />
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
