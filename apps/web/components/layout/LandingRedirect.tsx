"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";

/**
 * Silently redirects authenticated users from the landing page to /app.
 * Renders nothing — drop it anywhere in the landing page tree.
 */
export function LandingRedirect() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/app");
    }
  }, [isLoading, isAuthenticated, router]);

  return null;
}
