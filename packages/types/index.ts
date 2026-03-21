// Shared TypeScript interfaces mirroring the Pydantic schemas in
// apps/api/app/schemas/classify.py
// Shapes must match API_CONTRACTS.md exactly.

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const MODEL_NAMES = [
  "logistic_regression",
  "linear_svm",
  "xgboost",
  "lightgbm",
  "stacked_ensemble",
] as const;

export type ModelName = (typeof MODEL_NAMES)[number];

export const RISK_BANDS = ["low", "medium", "high"] as const;
export type RiskBand = (typeof RISK_BANDS)[number];

export type PredictionLabel = "spam" | "not_spam";
export type ClassifyMode = "email";

// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------

export interface ClassifyRequest {
  subject?: string;
  body?: string;
  mode: ClassifyMode;
}

// ---------------------------------------------------------------------------
// Sub-schemas
// ---------------------------------------------------------------------------

export interface ModelOutput {
  name: ModelName | string;
  prediction: PredictionLabel;
  /** 0.0 – 1.0 */
  confidence: number;
}

export interface EnsembleOutput {
  name: string;
  prediction: PredictionLabel;
  /** 0.0 – 1.0 */
  confidence: number;
}

export interface ExplanationOutput {
  top_signals: string[];
  subject_signals: string[];
  body_signals: string[];
}

// ---------------------------------------------------------------------------
// Response
// ---------------------------------------------------------------------------

export interface ClassifyResponse {
  /** UUID v4 string */
  request_id: string;
  mode: ClassifyMode;
  final_prediction: PredictionLabel;
  /** 0.0 – 1.0 */
  final_risk_score: number;
  risk_band: RiskBand;
  /** 0.0 – 1.0 */
  agreement_ratio: number;
  models: ModelOutput[];
  ensemble: EnsembleOutput;
  explanations: ExplanationOutput;
  model_version: string;
  /** ISO 8601 datetime string */
  timestamp: string;
}

// ---------------------------------------------------------------------------
// History (client-side, localStorage)
// ---------------------------------------------------------------------------

export interface HistoryItem {
  /** UUID v4 generated client-side at save time */
  id: string;
  /** ISO 8601 timestamp of when the result was saved */
  savedAt: string;
  /** Subject text as submitted in the form (empty string if omitted) */
  subject: string;
  /** Body text as submitted in the form */
  body: string;
  /** Full API response stored verbatim */
  result: ClassifyResponse;
}

// ---------------------------------------------------------------------------
// Error response
// ---------------------------------------------------------------------------

export interface ErrorDetail {
  code: string;
  message: string;
  details: Record<string, unknown>;
}

export interface ErrorResponse {
  error: ErrorDetail;
}
