"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Shield,
  History,
  Mail,
  Settings,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";
import { useAuth } from "../../hooks/useAuth";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import Image from "next/image";

const NAV_ITEMS = [
  {
    label: "History",
    href: "/app/history",
    icon: History,
    description: "Past classifications",
  },
  {
    label: "Gmail",
    href: "/app/gmail",
    icon: Mail,
    description: "Inbox scanner",
  },
  {
    label: "Insights",
    href: "/app/insights",
    icon: BarChart3,
    description: "Your stats",
  },
  {
    label: "Settings",
    href: "/app/settings",
    icon: Settings,
    description: "Preferences & rules",
  },
] as const;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();
  const { user, isLoading, logout } = useAuth();

  const sidebarWidth = collapsed ? 68 : 220;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <motion.aside
        animate={{ width: sidebarWidth }}
        transition={reducedMotion ? { duration: 0 } : { duration: 0.25, ease: [0.25, 0.1, 0.25, 1.0] }}
        className={cn(
          "relative flex-shrink-0 flex flex-col",
          "border-r border-white/[0.06]",
          "bg-surface-1/80 backdrop-blur-xl"
        )}
        style={{ width: sidebarWidth }}
      >
        {/* Top: Logo */}
        <div
          className={cn(
            "flex items-center h-16 border-b border-white/[0.06]",
            collapsed ? "justify-center px-0" : "px-4 gap-2.5"
          )}
        >
          <Link href="/app" className="flex items-center gap-2.5 rounded-sm focus-ring shrink-0">
            <Shield className="h-6 w-6 text-primary shrink-0 animate-glow-pulse" />
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.span
                  key="logo-text"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-base font-display font-bold tracking-tight text-foreground overflow-hidden whitespace-nowrap"
                >
                  SpamShield
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "absolute -right-3 top-[72px] z-10",
            "h-6 w-6 rounded-full",
            "flex items-center justify-center",
            "bg-surface-2 border border-white/[0.1]",
            "text-muted-foreground hover:text-foreground",
            "hover:border-primary/30 hover:bg-surface-3",
            "transition-all duration-200 shadow-sm"
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>

        {/* Nav items */}
        <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            const isActive = pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative flex items-center rounded-lg transition-all duration-200 group",
                  "focus-ring",
                  collapsed ? "justify-center h-10 w-10 mx-auto" : "gap-3 px-3 py-2.5",
                  isActive
                    ? "bg-primary/15 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.2)]"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface-2"
                )}
                title={collapsed ? label : undefined}
              >
                {/* Active glow */}
                {isActive && (
                  <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/10 to-transparent pointer-events-none" />
                )}
                <Icon
                  className={cn(
                    "h-4.5 w-4.5 shrink-0 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                    !collapsed && "h-4 w-4"
                  )}
                  style={{ width: 16, height: 16 }}
                />
                <AnimatePresence initial={false}>
                  {!collapsed && (
                    <motion.span
                      key={`label-${label}`}
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.18 }}
                      className={cn(
                        "text-sm font-medium overflow-hidden whitespace-nowrap",
                        isActive ? "text-primary" : ""
                      )}
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </nav>

        {/* Bottom: User info + sign out */}
        <div className="border-t border-white/[0.06] p-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-10">
              <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
            </div>
          ) : user ? (
            <div
              className={cn(
                "flex items-center rounded-lg",
                collapsed ? "justify-center py-2" : "gap-2.5 px-2 py-2"
              )}
            >
              <SidebarAvatar user={user} />
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.div
                    key="user-info"
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.18 }}
                    className="flex-1 min-w-0 overflow-hidden"
                  >
                    <p className="text-xs font-medium text-foreground truncate">
                      {user.name ?? "User"}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.button
                    key="logout-btn"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    onClick={logout}
                    aria-label="Sign out"
                    className="ml-auto p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          ) : null}
        </div>
      </motion.aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 border-b border-white/[0.06] flex items-center px-6 shrink-0">
          <nav className="flex items-center gap-1.5 text-sm" aria-label="Breadcrumb">
            <Link href="/app" className="text-muted-foreground hover:text-foreground transition-colors">
              App
            </Link>
            {pathname !== "/app" && (
              <>
                <span className="text-muted-foreground/40">/</span>
                <span className="text-foreground font-medium capitalize">
                  {pathname.split("/").at(-1)}
                </span>
              </>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {/* Back to landing */}
            <Link
              href="/"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back to site
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarAvatar({
  user,
}: {
  user: { name: string | null; email: string; avatar_url: string | null };
}) {
  const size = 28;
  const initials = (user.name ?? user.email)
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  if (user.avatar_url) {
    return (
      <Image
        src={user.avatar_url}
        alt={user.name ?? "User avatar"}
        width={size}
        height={size}
        className="rounded-full ring-1 ring-primary/30 shrink-0"
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div
      style={{ width: size, height: size, fontSize: 11 }}
      className="rounded-full bg-gradient-to-br from-primary to-cyan flex items-center justify-center text-primary-foreground font-bold ring-1 ring-primary/30 shrink-0"
    >
      {initials}
    </div>
  );
}
