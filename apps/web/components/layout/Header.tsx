"use client";

import { useState, useEffect, useRef } from "react";
import { Shield, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";

const NAV_LINKS = [
  { label: "How it Works", href: "#how-it-works" },
  { label: "Demo", href: "#demo" },
  { label: "Metrics", href: "#metrics" },
] as const;

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-background/80 backdrop-blur-md border-b border-border"
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
          <a href="#" className="flex items-center gap-2 group rounded-sm focus-ring">
            <Shield className="h-6 w-6 text-primary transition-transform group-hover:scale-110" />
            <span className="text-lg font-bold tracking-tight text-foreground">
              SpamShield
            </span>
          </a>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8" aria-label="Main navigation">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-foreground active:text-foreground transition-colors rounded-sm focus-ring"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            <a
              href="#demo"
              className={cn(
                "inline-flex items-center justify-center rounded-lg px-5 py-2 text-sm font-medium",
                "bg-primary text-primary-foreground",
                "hover:shadow-[0_0_20px_hsl(var(--primary-glow)/0.4)] transition-all duration-200",
                "hover:brightness-110 active:scale-[0.97]",
                "focus-ring"
              )}
            >
              Try Demo
            </a>
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
            className="md:hidden bg-background/95 backdrop-blur-md border-b border-border overflow-hidden"
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
                  "bg-primary text-primary-foreground",
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
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
