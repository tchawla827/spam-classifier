"use client";

import React from "react";
import { render, waitFor } from "@testing-library/react";

const mockReplace = jest.fn();
const mockRefreshUser = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    refreshUser: mockRefreshUser,
  }),
}));

describe("Auth callback page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("redirects to /app when a user is loaded", async () => {
    mockRefreshUser.mockResolvedValueOnce({ id: "user-1" });

    const AuthCallbackPage = (await import("@/app/auth/callback/page")).default;
    render(<AuthCallbackPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/app");
    });
  });

  it("redirects to auth_error when no user is loaded", async () => {
    mockRefreshUser.mockResolvedValueOnce(null);

    const AuthCallbackPage = (await import("@/app/auth/callback/page")).default;
    render(<AuthCallbackPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/?auth_error=1");
    });
  });
});
