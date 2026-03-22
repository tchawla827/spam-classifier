"use client";

import { cn } from "../../lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hoverGlow?: boolean;
  as?: "div" | "article";
}

export function GlassCard({
  children,
  className,
  hoverGlow = false,
  as: Tag = "div",
}: GlassCardProps) {
  return (
    <Tag
      className={cn(
        "glass rounded-xl",
        hoverGlow &&
          "transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-glow-sm",
        className
      )}
    >
      {children}
    </Tag>
  );
}
