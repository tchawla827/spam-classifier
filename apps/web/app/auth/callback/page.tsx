"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Shield, Loader2 } from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    refreshUser()
      .then(() => {
        router.replace("/app");
      })
      .catch(() => {
        router.replace("/?auth_error=1");
      });
  }, [refreshUser, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-background">
      {/* Animated shield */}
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl scale-150 animate-pulse" />
        <div className="relative w-16 h-16 rounded-full bg-surface-2 border border-white/[0.08] flex items-center justify-center">
          <Shield className="h-8 w-8 text-primary animate-glow-pulse" />
        </div>
      </div>

      {/* Text */}
      <div className="text-center space-y-1.5">
        <h1 className="text-xl font-display font-bold text-foreground">
          Signing you in…
        </h1>
        <p className="text-sm text-muted-foreground">
          Completing your Google sign-in. Hang tight.
        </p>
      </div>

      {/* Spinner */}
      <Loader2 className="h-5 w-5 text-primary animate-spin" />
    </div>
  );
}
