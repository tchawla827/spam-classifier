/**
 * V1 Regression Smoke Tests
 *
 * Verify that the core V1 UI components render without errors after
 * any V2 additions. These tests do NOT test behaviour — only that the
 * components mount successfully and expose the expected elements.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { Header } from "@/components/layout/Header";
import { ClassifyForm } from "@/components/classify/ClassifyForm";

// ---------------------------------------------------------------------------
// Mocks required for components that use browser APIs or animation
// ---------------------------------------------------------------------------

jest.mock("framer-motion", () => {
  const actual = jest.requireActual("framer-motion");
  return {
    ...actual,
    motion: new Proxy(actual.motion, {
      get: (_target: object, prop: string) =>
        // Return a simple passthrough div/span/header for every HTML element
        function MotionStub({
          children,
          ...rest
        }: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) {
          return React.createElement(prop as keyof JSX.IntrinsicElements, rest, children);
        },
    }),
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    useReducedMotion: () => false,
  };
});

jest.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => false,
}));

jest.mock("@/lib/api/classify", () => ({
  classifyEmail: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

describe("Header (V1 regression)", () => {
  it("renders without crashing", () => {
    render(<Header />);
  });

  it("renders the SpamShield brand name", () => {
    render(<Header />);
    expect(screen.getByText("SpamShield")).toBeInTheDocument();
  });

  it("renders the primary nav links", () => {
    render(<Header />);
    expect(screen.getByText("How it Works")).toBeInTheDocument();
    expect(screen.getByText("Demo")).toBeInTheDocument();
    expect(screen.getByText("Metrics")).toBeInTheDocument();
  });

  it("renders the Try Demo CTA", () => {
    render(<Header />);
    // There are two "Try Demo" links (desktop + mobile), getAll to avoid ambiguity
    const ctaLinks = screen.getAllByText("Try Demo");
    expect(ctaLinks.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// ClassifyForm
// ---------------------------------------------------------------------------

describe("ClassifyForm (V1 regression)", () => {
  const noop = jest.fn();

  it("renders without crashing", () => {
    render(<ClassifyForm onResult={noop} />);
  });

  it("renders the subject input", () => {
    render(<ClassifyForm onResult={noop} />);
    expect(screen.getByLabelText(/subject/i)).toBeInTheDocument();
  });

  it("renders the email body input", () => {
    render(<ClassifyForm onResult={noop} />);
    expect(screen.getByLabelText(/email body/i)).toBeInTheDocument();
  });

  it("submit button is present", () => {
    render(<ClassifyForm onResult={noop} />);
    expect(screen.getByRole("button", { name: /classify/i })).toBeInTheDocument();
  });
});
