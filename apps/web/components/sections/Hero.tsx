"use client";

import dynamic from "next/dynamic";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { HeroStatus } from "@/components/hero/HeroStatus";
import { AccessibleControls } from "@/components/hero/AccessibleControls";

const SpamHeroScene = dynamic(
  () => import("@/components/hero/SpamHeroScene"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full aspect-[4/3] lg:aspect-[3/2] bg-card/30 rounded-xl animate-pulse flex items-center justify-center">
        <span className="text-sm text-muted-foreground">Loading scene...</span>
      </div>
    ),
  }
);

export function Hero() {
  return (
    <section
      id="hero"
      className="relative min-h-[90vh] flex items-center pt-16"
    >
      <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-12 lg:py-0">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-8 lg:gap-12 items-center">
          {/* Left: Copy */}
          <div className="space-y-6 text-center lg:text-left">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
              Turn spam into{" "}
              <span className="text-primary">trash.</span>
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-lg mx-auto lg:mx-0">
              AI-powered spam detection for cleaner inboxes, safer clicks, and
              faster message triage.
            </p>

            {/* CTA Stack */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <a
                href="#demo"
                className={cn(
                  "inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold",
                  "bg-primary text-primary-foreground",
                  "hover:shadow-[0_0_24px_hsl(var(--primary-glow)/0.4)] transition-all duration-200",
                  "hover:brightness-110 active:scale-[0.97]"
                )}
              >
                Try Demo
              </a>
              <a
                href="#how-it-works"
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-medium",
                  "border border-border text-muted-foreground",
                  "hover:text-foreground hover:border-primary/50 transition-all duration-200"
                )}
              >
                See How It Works
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>

            <p className="text-sm text-muted-foreground/70">
              Click a spam item to toss it away.
            </p>
          </div>

          {/* Right: 3D Scene */}
          <div className="relative">
            <SpamHeroScene />

            <div className="mt-4 flex flex-col items-center lg:items-start gap-3">
              <HeroStatus />
              <AccessibleControls />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
