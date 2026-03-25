import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClassifyForm } from "@/components/classify/ClassifyForm";

// Mock the API module so no real fetch occurs
jest.mock("@/lib/api/classify", () => ({
  classifyEmail: jest.fn(),
  RateLimitError: class RateLimitError extends Error {
    retryAfter = 0;
  },
}));

import { classifyEmail } from "@/lib/api/classify";

const mockClassifyEmail = classifyEmail as jest.MockedFunction<typeof classifyEmail>;

const mockResult = {
  request_id: "abc-123",
  mode: "email" as const,
  final_prediction: "spam" as const,
  final_risk_score: 0.9,
  risk_band: "high" as const,
  agreement_ratio: 1.0,
  models: [],
  ensemble: { name: "stacked_ensemble", prediction: "spam" as const, confidence: 0.9 },
  explanations: { top_signals: [], subject_signals: [], body_signals: [] },
  model_version: "test-v1",
  timestamp: new Date().toISOString(),
};

describe("ClassifyForm", () => {
  const onResult = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders subject and body inputs", () => {
    render(<ClassifyForm onResult={onResult} />);
    expect(screen.getByLabelText(/subject/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email body/i)).toBeInTheDocument();
  });

  it("submit button is disabled when both fields are empty", () => {
    render(<ClassifyForm onResult={onResult} />);
    const button = screen.getByRole("button", { name: /classify/i });
    expect(button).toBeDisabled();
    expect(mockClassifyEmail).not.toHaveBeenCalled();
  });

  it("calls classifyEmail with body when only body is provided", async () => {
    mockClassifyEmail.mockResolvedValueOnce(mockResult);
    render(<ClassifyForm onResult={onResult} />);
    const bodyInput = screen.getByLabelText(/email body/i);
    await userEvent.type(bodyInput, "This is a spam email body");
    await userEvent.click(screen.getByRole("button", { name: /classify/i }));
    await waitFor(() => expect(mockClassifyEmail).toHaveBeenCalledTimes(1));
    expect(mockClassifyEmail).toHaveBeenCalledWith(
      expect.objectContaining({ body: "This is a spam email body" })
    );
  });

  it("calls onResult with result after successful classification", async () => {
    mockClassifyEmail.mockResolvedValueOnce(mockResult);
    render(<ClassifyForm onResult={onResult} />);
    await userEvent.type(screen.getByLabelText(/email body/i), "Spam content");
    await userEvent.click(screen.getByRole("button", { name: /classify/i }));
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(mockResult, "", "Spam content"));
  });

  it("shows error message when API call fails", async () => {
    mockClassifyEmail.mockRejectedValueOnce(new Error("Server error"));
    render(<ClassifyForm onResult={onResult} />);
    await userEvent.type(screen.getByLabelText(/email body/i), "Some email text");
    await userEvent.click(screen.getByRole("button", { name: /classify/i }));
    expect(await screen.findByText("Server error")).toBeInTheDocument();
  });

  it("populates fields from initialSubject and initialBody props", () => {
    render(
      <ClassifyForm
        onResult={onResult}
        initialSubject="Test Subject"
        initialBody="Test Body"
      />
    );
    expect(screen.getByLabelText(/subject/i)).toHaveValue("Test Subject");
    expect(screen.getByLabelText(/email body/i)).toHaveValue("Test Body");
  });
});
