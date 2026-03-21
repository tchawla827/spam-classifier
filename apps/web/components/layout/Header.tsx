"use client";

import { useState, useEffect } from "react";
import { Shield, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "How it Works", href: "#how-it-works" },
  { label: "Demo", href: "#demo" },
  { label: "Metrics", href: "#metrics" },
] as const;

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2 group">
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
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
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
                "hover:brightness-110 active:scale-[0.97]"
              )}
            >
              Try Demo
            </a>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-background/95 backdrop-blur-md border-b border-border">
          <nav className="px-4 py-4 space-y-3" aria-label="Mobile navigation">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="block text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <a
              href="#demo"
              className={cn(
                "block text-center rounded-lg px-5 py-2 text-sm font-medium mt-2",
                "bg-primary text-primary-foreground",
                "hover:brightness-110 transition-all"
              )}
              onClick={() => setMobileMenuOpen(false)}
            >
              Try Demo
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
