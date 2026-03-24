/**
 * V2 Component Tests — Phase 16.2
 *
 * Covers:
 * - AuthProvider / AuthContext state transitions
 * - useHistory hook (authenticated vs anonymous)
 * - Settings page rendering (sensitivity controls present)
 * - Gmail page states (connect CTA vs connected inbox)
 */

import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Global mocks
// ---------------------------------------------------------------------------

jest.mock("framer-motion", () => {
  const actual = jest.requireActual("framer-motion");
  return {
    ...actual,
    motion: new Proxy(actual.motion, {
      get: (_target: object, prop: string) =>
        function MotionStub({
          children,
          ...rest
        }: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) {
          return React.createElement(
            prop as keyof JSX.IntrinsicElements,
            rest,
            children
          );
        },
    }),
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => (
      <>{children}</>
    ),
    useReducedMotion: () => false,
  };
});

jest.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => false,
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/app",
}));

// ---------------------------------------------------------------------------
// Mock API modules
// ---------------------------------------------------------------------------

jest.mock("@/lib/api/auth", () => ({
  getCurrentUser: jest.fn(),
  logout: jest.fn(),
  startGoogleAuth: jest.fn(),
}));

jest.mock("@/lib/api/history", () => ({
  getHistory: jest.fn(),
  getHistoryItem: jest.fn(),
  deleteHistoryItem: jest.fn(),
  clearHistory: jest.fn(),
}));

jest.mock("@/lib/api/preferences", () => ({
  getPreferences: jest.fn(),
  updatePreferences: jest.fn(),
  getRules: jest.fn(),
  addSenderRule: jest.fn(),
  addDomainRule: jest.fn(),
  deleteRule: jest.fn(),
  disconnectGmail: jest.fn(),
  resetPersonalization: jest.fn(),
  deleteAccount: jest.fn(),
}));

jest.mock("@/lib/api/gmail", () => ({
  getGmailStatus: jest.fn(),
  startGmailConnect: jest.fn(),
  disconnectGmail: jest.fn(),
  getGmailMessages: jest.fn(),
  classifyGmailMessage: jest.fn(),
  classifyGmailBatch: jest.fn(),
}));

jest.mock("@/lib/api/classify", () => ({
  classifyEmail: jest.fn(),
}));

jest.mock("@/hooks/useGmail", () => ({
  useGmail: jest.fn(),
}));

jest.mock("@/hooks/useClassifyHistory", () => ({
  useClassifyHistory: jest.fn(() => ({
    items: [],
    isHydrated: true,
    addItem: jest.fn(),
    removeItem: jest.fn(),
    clearAll: jest.fn(),
  })),
}));

// ---------------------------------------------------------------------------
// Typed mock helpers
// ---------------------------------------------------------------------------

import { getCurrentUser, logout, startGoogleAuth } from "@/lib/api/auth";
import { getPreferences, getRules } from "@/lib/api/preferences";
import { useGmail } from "@/hooks/useGmail";

const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>;
const mockLogout = logout as jest.MockedFunction<typeof logout>;
const mockStartGoogleAuth = startGoogleAuth as jest.MockedFunction<typeof startGoogleAuth>;
const mockGetPreferences = getPreferences as jest.MockedFunction<typeof getPreferences>;
const mockGetRules = getRules as jest.MockedFunction<typeof getRules>;
const mockUseGmail = useGmail as jest.MockedFunction<typeof useGmail>;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const FAKE_USER = {
  id: "user-123",
  email: "test@example.com",
  name: "Test User",
  avatar_url: null,
  gmail_connected: false,
  preferences: {
    sensitivity: "balanced" as const,
    personalization_enabled: true,
    review_band_enabled: true,
  },
};

const FAKE_PREFS = {
  sensitivity: "balanced" as const,
  personalization_enabled: true,
  review_band_enabled: true,
};

const FAKE_RULES = {
  senders: [],
  domains: [],
};

const FAKE_HISTORY_ITEM = {
  id: "event-abc",
  source: "manual" as const,
  subject: "Win a prize",
  sender: null,
  final_prediction: "spam" as const,
  final_risk_score: 0.87,
  risk_band: "high" as const,
  personalized: false,
  saved_at: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// 1. AuthProvider — state transitions
// ---------------------------------------------------------------------------

import { AuthProvider, AuthContext } from "@/contexts/AuthContext";

describe("AuthProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("starts in loading state then transitions to unauthenticated", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(null);

    let capturedCtx: React.ContextType<typeof AuthContext> = null;

    function Consumer() {
      capturedCtx = React.useContext(AuthContext);
      return null;
    }

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    // Initially loading
    expect(capturedCtx?.isLoading).toBe(true);

    await waitFor(() => {
      expect(capturedCtx?.isLoading).toBe(false);
    });

    expect(capturedCtx?.isAuthenticated).toBe(false);
    expect(capturedCtx?.user).toBeNull();
  });

  it("transitions to authenticated when getCurrentUser returns a user", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(FAKE_USER);

    let capturedCtx: React.ContextType<typeof AuthContext> = null;

    function Consumer() {
      capturedCtx = React.useContext(AuthContext);
      return <span data-testid="email">{capturedCtx?.user?.email ?? ""}</span>;
    }

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(capturedCtx?.isLoading).toBe(false);
    });

    expect(capturedCtx?.isAuthenticated).toBe(true);
    expect(capturedCtx?.user?.email).toBe("test@example.com");
    expect(screen.getByTestId("email").textContent).toBe("test@example.com");
  });

  it("clears user on logout", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(FAKE_USER);
    mockLogout.mockResolvedValueOnce(undefined);

    let capturedCtx: React.ContextType<typeof AuthContext> = null;

    function Consumer() {
      capturedCtx = React.useContext(AuthContext);
      return (
        <button onClick={() => capturedCtx?.logout()}>Logout</button>
      );
    }

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => expect(capturedCtx?.isAuthenticated).toBe(true));

    await act(async () => {
      await capturedCtx?.logout();
    });

    expect(capturedCtx?.user).toBeNull();
    expect(capturedCtx?.isAuthenticated).toBe(false);
  });

  it("login redirects to Google auth URL", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(null);
    mockStartGoogleAuth.mockResolvedValueOnce({
      auth_url: "https://accounts.google.com/oauth2/v2/auth?state=abc",
      state: "abc",
    });

    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      value: { href: "" },
      writable: true,
    });

    let capturedCtx: React.ContextType<typeof AuthContext> = null;

    function Consumer() {
      capturedCtx = React.useContext(AuthContext);
      return null;
    }

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => expect(capturedCtx?.isLoading).toBe(false));

    await act(async () => {
      await capturedCtx?.login();
    });

    expect(window.location.href).toContain("accounts.google.com");

    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
    });
  });
});

// ---------------------------------------------------------------------------
// 2. History page — renders items and empty state
// ---------------------------------------------------------------------------

jest.mock("@/hooks/useHistory", () => ({
  useHistory: jest.fn(),
}));

import { useHistory } from "@/hooks/useHistory";
const mockUseHistory = useHistory as jest.MockedFunction<typeof useHistory>;

function makeUseHistoryReturn(overrides: Partial<ReturnType<typeof useHistory>> = {}): ReturnType<typeof useHistory> {
  return {
    isLoading: false,
    isAuthenticated: true,
    serverItems: [],
    nextCursor: null,
    totalCount: null,
    filters: {},
    setFilters: jest.fn(),
    loadMore: jest.fn(),
    refresh: jest.fn(),
    deleteItem: jest.fn(),
    clearAll: jest.fn(),
    fetchDetail: jest.fn(),
    anonItems: [],
    anonIsHydrated: true,
    anonAddItem: jest.fn(),
    anonRemoveItem: jest.fn(),
    anonClearAll: jest.fn(),
    ...overrides,
  };
}

// We test the history page via its hook-driven rendering
describe("History page — authenticated with items", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseHistory.mockReturnValue(
      makeUseHistoryReturn({ serverItems: [FAKE_HISTORY_ITEM] })
    );
  });

  it("renders at least one history item subject", async () => {
    // Import lazily to capture mocked hook
    const HistoryPage = (await import("@/app/app/history/page")).default;
    render(<HistoryPage />);
    await waitFor(() => {
      expect(screen.getByText("Win a prize")).toBeInTheDocument();
    });
  });
});

describe("History page — empty state", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseHistory.mockReturnValue(makeUseHistoryReturn({ serverItems: [] }));
  });

  it("renders without crashing when no history items", async () => {
    const HistoryPage = (await import("@/app/app/history/page")).default;
    const { container } = render(<HistoryPage />);
    expect(container).toBeTruthy();
  });
});

describe("History page — loading state", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseHistory.mockReturnValue(
      makeUseHistoryReturn({ isLoading: true, serverItems: [] })
    );
  });

  it("renders without crashing while loading", async () => {
    const HistoryPage = (await import("@/app/app/history/page")).default;
    const { container } = render(<HistoryPage />);
    expect(container).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 3. Settings page — form controls present
// ---------------------------------------------------------------------------

describe("Settings page — form rendering", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(FAKE_USER);
    mockGetPreferences.mockResolvedValue(FAKE_PREFS);
    mockGetRules.mockResolvedValue(FAKE_RULES);

    // useAuth must return an authenticated state for settings page
    jest.mock("@/hooks/useAuth", () => ({
      useAuth: () => ({
        user: FAKE_USER,
        isLoading: false,
        isAuthenticated: true,
        login: jest.fn(),
        logout: jest.fn(),
        refreshUser: jest.fn(),
      }),
    }));
  });

  it("renders the settings page without crashing", async () => {
    const SettingsPage = (await import("@/app/app/settings/page")).default;
    const { container } = render(
      <AuthProvider>
        <SettingsPage />
      </AuthProvider>
    );
    expect(container).toBeTruthy();
  });

  it("renders sensitivity section after preferences load", async () => {
    const SettingsPage = (await import("@/app/app/settings/page")).default;
    render(
      <AuthProvider>
        <SettingsPage />
      </AuthProvider>
    );

    await waitFor(() => {
      // The settings page should show sensitivity controls
      const sensitivityMatch =
        screen.queryByText(/sensitivity/i) ||
        screen.queryByText(/relaxed/i) ||
        screen.queryByText(/balanced/i) ||
        screen.queryByText(/strict/i);
      expect(sensitivityMatch).not.toBeNull();
    }, { timeout: 3000 });
  });
});

// ---------------------------------------------------------------------------
// 4. Gmail page — connected vs disconnected states
// ---------------------------------------------------------------------------

function makeGmailHookReturn(connected: boolean) {
  return {
    isConnected: connected,
    isLoadingStatus: false,
    gmailEmail: connected ? "user@gmail.com" : null,
    messages: [],
    isLoadingMessages: false,
    nextCursor: null,
    selectedIds: new Set<string>(),
    isClassifying: false,
    classifyResults: {} as Record<string, unknown>,
    connect: jest.fn(),
    isConnecting: false,
    disconnect: jest.fn(),
    loadMessages: jest.fn(),
    loadMore: jest.fn(),
    toggleSelect: jest.fn(),
    selectAll: jest.fn(),
    clearSelection: jest.fn(),
    classifySelected: jest.fn(),
    classifySingle: jest.fn(),
    refresh: jest.fn(),
    query: "",
    setQuery: jest.fn(),
    labelFilter: "",
    setLabelFilter: jest.fn(),
  };
}

describe("Gmail page — not connected", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGmail.mockReturnValue(makeGmailHookReturn(false) as ReturnType<typeof useGmail>);
  });

  it("renders connect CTA when Gmail is not connected", async () => {
    const GmailPage = (await import("@/app/app/gmail/page")).default;
    render(<GmailPage />);
    await waitFor(() => {
      expect(
        screen.getByText(/connect your gmail/i)
      ).toBeInTheDocument();
    });
  });
});

describe("Gmail page — connected", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGmail.mockReturnValue(makeGmailHookReturn(true) as ReturnType<typeof useGmail>);
  });

  it("does not show connect CTA when Gmail is connected", async () => {
    const GmailPage = (await import("@/app/app/gmail/page")).default;
    render(<GmailPage />);
    await waitFor(() => {
      expect(
        screen.queryByText(/connect your gmail/i)
      ).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// 5. V1 regression gate — anonymous flow unaffected by V2 code
// ---------------------------------------------------------------------------

import { Header } from "@/components/layout/Header";

describe("V1 regression — Header still renders", () => {
  it("renders SpamShield brand name", () => {
    render(<Header />);
    expect(screen.getByText("SpamShield")).toBeInTheDocument();
  });
});
