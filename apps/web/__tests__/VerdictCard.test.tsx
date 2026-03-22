import React from "react";
import { render, screen } from "@testing-library/react";
import { VerdictCard } from "@/components/classify/VerdictCard";
import type { ClassifyResponse } from "@/lib/api/classify";

const spamResult: ClassifyResponse = {
  request_id: "abc-123",
  mode: "email",
  final_prediction: "spam",
  final_risk_score: 0.92,
  risk_band: "high",
  agreement_ratio: 1.0,
  models: [
    { name: "logistic_regression", prediction: "spam", confidence: 0.9 },
    { name: "linear_svm", prediction: "spam", confidence: 0.95 },
  ],
  ensemble: { name: "stacked_ensemble", prediction: "spam", confidence: 0.92 },
  explanations: {
    top_signals: ["urgent language", "suspicious url"],
    subject_signals: [],
    body_signals: [],
  },
  model_version: "test-v1",
  timestamp: new Date().toISOString(),
};

const safeResult: ClassifyResponse = {
  ...spamResult,
  final_prediction: "not_spam",
  final_risk_score: 0.05,
  risk_band: "low",
  agreement_ratio: 1.0,
  models: [
    { name: "logistic_regression", prediction: "not_spam", confidence: 0.95 },
    { name: "linear_svm", prediction: "not_spam", confidence: 0.97 },
  ],
  ensemble: { name: "stacked_ensemble", prediction: "not_spam", confidence: 0.95 },
  explanations: { top_signals: [], subject_signals: [], body_signals: [] },
};

describe("VerdictCard", () => {
  it("shows Spam badge for spam result", () => {
    render(<VerdictCard result={spamResult} />);
    // At least one "Spam" label is present (header badge)
    expect(screen.getAllByText("Spam").length).toBeGreaterThan(0);
  });

  it("shows Safe badge for not_spam result", () => {
    render(<VerdictCard result={safeResult} />);
    expect(screen.getAllByText("Safe").length).toBeGreaterThan(0);
  });

  it("renders risk score as percentage", () => {
    render(<VerdictCard result={spamResult} />);
    // Both risk score and ensemble confidence show 92.0%
    expect(screen.getAllByText("92.0%").length).toBeGreaterThan(0);
  });

  it("renders ensemble confidence label", () => {
    render(<VerdictCard result={spamResult} />);
    expect(screen.getByText("Ensemble Confidence")).toBeInTheDocument();
  });

  it("renders a row for each model in the breakdown", () => {
    render(<VerdictCard result={spamResult} />);
    expect(screen.getByText("Logistic Regression")).toBeInTheDocument();
    expect(screen.getByText("Linear Svm")).toBeInTheDocument();
  });

  it("renders key signals when present", () => {
    render(<VerdictCard result={spamResult} />);
    expect(screen.getByText("urgent language")).toBeInTheDocument();
    expect(screen.getByText("suspicious url")).toBeInTheDocument();
  });

  it("does not render key signals section when empty", () => {
    render(<VerdictCard result={safeResult} />);
    expect(screen.queryByText("Key Signals")).not.toBeInTheDocument();
  });

  it("shows high risk band for spam", () => {
    render(<VerdictCard result={spamResult} />);
    expect(screen.getByText(/high risk/i)).toBeInTheDocument();
  });

  it("shows low risk band for safe", () => {
    render(<VerdictCard result={safeResult} />);
    expect(screen.getByText(/low risk/i)).toBeInTheDocument();
  });
});
