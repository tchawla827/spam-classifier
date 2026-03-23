const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface UserPreferencesResponse {
  sensitivity: "strict" | "balanced" | "relaxed";
  personalization_enabled: boolean;
  review_band_enabled: boolean;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  gmail_connected: boolean;
  preferences: UserPreferencesResponse;
}

export async function startGoogleAuth(): Promise<{
  auth_url: string;
  state: string;
}> {
  const res = await fetch(`${API_BASE}/api/v1/auth/google/start`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to start Google auth");
  return res.json();
}

export async function getCurrentUser(): Promise<UserResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/me`, {
      credentials: "include",
    });
    if (res.status === 401) return null;
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/api/v1/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
}
