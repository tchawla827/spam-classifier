"use client";

import { useState, useEffect, useRef } from "react";
import { Shield, Menu, X, LogOut, LayoutDashboard, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { useAuth } from "../../hooks/useAuth";

const NAV_LINKS = [
  { label: "How it Works", href: "#how-it-works" },
  { label: "Demo", href: "#demo" },
  { label: "Metrics", href: "#metrics" },
] as const;

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const { user, isLoading, isAuthenticated, login, logout } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close user menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <motion.header
      initial={reducedMotion ? undefined : { y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2, ease: [0.25, 0.1, 0.25, 1.0] }}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "glass border-b border-white/[0.06] shadow-[0_1px_0_0_hsl(var(--primary)/0.08)]"
          : "bg-transparent"
      )}
    >
      {/* Skip to content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[60] focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-md focus:text-sm focus:font-medium"
      >
        Skip to content
      </a>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2 group rounded-sm focus-ring">
            <Shield className="h-6 w-6 text-primary animate-glow-pulse transition-transform group-hover:scale-110" />
            <span className="text-lg font-display font-bold tracking-tight text-foreground">
              SpamShield
            </span>
          </a>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8" aria-label="Main navigation">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="relative text-sm text-muted-foreground hover:text-foreground active:text-foreground transition-colors rounded-sm focus-ring group py-1"
              >
                {link.label}
                <span className="absolute bottom-0 left-0 h-[1.5px] w-full scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left bg-gradient-to-r from-primary to-cyan" />
              </a>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href="#demo"
              className={cn(
                "relative inline-flex items-center justify-center rounded-lg px-5 py-2 text-sm font-medium",
                "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground",
                "hover:shadow-glow-md transition-all duration-200",
                "hover:brightness-110 active:scale-[0.97]",
                "focus-ring"
              )}
            >
              Try Demo
            </a>

            {/* Auth section */}
            {isLoading ? (
              <div className="w-9 h-9 flex items-center justify-center">
                <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
              </div>
            ) : isAuthenticated && user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  aria-label="Open user menu"
                  aria-expanded={userMenuOpen}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2 py-1.5",
                    "border border-white/[0.08] hover:border-primary/30",
                    "bg-surface-2/50 hover:bg-surface-2 transition-all duration-200",
                    "focus-ring group"
                  )}
                >
                  <UserAvatar user={user} size={28} />
                  <span className="text-sm font-medium text-foreground max-w-[100px] truncate hidden lg:block">
                    {user.name ?? user.email.split("@")[0]}
                  </span>
                </button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.97 }}
                      transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1.0] }}
                      className={cn(
                        "absolute right-0 top-full mt-2 w-52",
                        "glass-strong rounded-xl border border-white/[0.08]",
                        "shadow-[0_8px_32px_hsl(var(--primary)/0.15)]",
                        "overflow-hidden z-50"
                      )}
                    >
                      {/* User info */}
                      <div className="px-4 py-3 border-b border-white/[0.06]">
                        <p className="text-sm font-medium text-foreground truncate">
                          {user.name ?? "User"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {user.email}
                        </p>
                      </div>

                      {/* Menu items */}
                      <div className="p-1.5">
                        <a
                          href="/app"
                          onClick={() => setUserMenuOpen(false)}
                          className={cn(
                            "flex items-center gap-2.5 px-3 py-2 rounded-lg",
                            "text-sm text-foreground hover:bg-primary/10 hover:text-primary",
                            "transition-colors duration-150 group"
                          )}
                        >
                          <LayoutDashboard className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          Open App
                        </a>
                        <button
                          onClick={async () => {
                            setUserMenuOpen(false);
                            await logout();
                          }}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg",
                            "text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
                            "transition-colors duration-150 group"
                          )}
                        >
                          <LogOut className="h-4 w-4 transition-colors" />
                          Sign Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button
                onClick={login}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium",
                  "border border-white/[0.1] text-foreground",
                  "hover:border-primary/40 hover:bg-primary/5 hover:text-primary",
                  "transition-all duration-200 active:scale-[0.97]",
                  "focus-ring"
                )}
              >
                <GoogleIcon className="h-4 w-4" />
                Sign In
              </button>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            ref={toggleRef}
            className="md:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors rounded-md focus-ring"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1.0] }}
            className="md:hidden glass-strong border-b border-white/[0.06] overflow-hidden"
          >
            <nav className="px-4 py-4 space-y-3" aria-label="Mobile navigation">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="block text-sm text-muted-foreground hover:text-foreground active:text-foreground transition-colors py-2 rounded-sm focus-ring"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    toggleRef.current?.focus();
                  }}
                >
                  {link.label}
                </a>
              ))}
              <a
                href="#demo"
                className={cn(
                  "block text-center rounded-lg px-5 py-2 text-sm font-medium mt-2",
                  "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground",
                  "hover:brightness-110 active:scale-[0.97] transition-all",
                  "focus-ring"
                )}
                onClick={() => {
                  setMobileMenuOpen(false);
                  toggleRef.current?.focus();
                }}
              >
                Try Demo
              </a>

              {/* Mobile auth */}
              {!isLoading && (
                <div className="pt-1 border-t border-white/[0.06]">
                  {isAuthenticated && user ? (
                    <>
                      <div className="flex items-center gap-2.5 py-2">
                        <UserAvatar user={user} size={32} />
                        <div>
                          <p className="text-sm font-medium text-foreground">{user.name ?? "User"}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <a
                        href="/app"
                        className="flex items-center gap-2 py-2 text-sm text-foreground hover:text-primary transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        Open App
                      </a>
                      <button
                        onClick={async () => {
                          setMobileMenuOpen(false);
                          await logout();
                        }}
                        className="flex items-center gap-2 py-2 text-sm text-muted-foreground hover:text-destructive transition-colors w-full text-left"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        login();
                      }}
                      className="flex items-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <GoogleIcon className="h-4 w-4" />
                      Sign In with Google
                    </button>
                  )}
                </div>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function UserAvatar({
  user,
  size,
}: {
  user: { name: string | null; email: string; avatar_url: string | null };
  size: number;
}) {
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
        className="rounded-full ring-1 ring-primary/30"
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      className="rounded-full bg-gradient-to-br from-primary to-cyan flex items-center justify-center text-primary-foreground font-bold ring-1 ring-primary/30"
    >
      {initials}
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}
