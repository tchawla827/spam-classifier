"use client";

import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function FinalCTA() {
  return (
    <section aria-label="Call to action" className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6 }}
          className={cn(
            "relative rounded-2xl border border-border overflow-hidden",
            "bg-gradient-to-br from-card/90 via-card/70 to-primary/5",
            "px-6 py-16 sm:px-12 sm:py-20 text-center"
          )}
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
            Ready to clean up your inbox?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
            Try the spam classifier now. Paste an email, get an instant
            verdict &mdash; no signup required.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="#demo"
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-lg px-8 py-3.5 text-sm font-semibold",
                "bg-primary text-primary-foreground",
                "hover:shadow-[0_0_32px_hsl(var(--primary-glow)/0.5)] transition-all duration-200",
                "hover:brightness-110 active:scale-[0.97]"
              )}
            >
              Try the Classifier
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
