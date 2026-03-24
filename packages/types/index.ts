// Shared TypeScript interfaces mirroring the Pydantic schemas in apps/api/app/schemas/
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
// Classify — Request
// ---------------------------------------------------------------------------

export interface ClassifyRequest {
  subject?: string;
  body?: string;
  mode: ClassifyMode;
}

// ---------------------------------------------------------------------------
// Classify — Sub-schemas
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
// Classify — Response
// ---------------------------------------------------------------------------

export type ReviewState = "spam" | "not_spam" | "review";

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
  /** Present when the result was personalized for an authenticated user */
  personalized?: boolean;
  /** Personalized verdict state; "review" means uncertain / needs human check */
  review_state?: ReviewState;
  /** Human-readable reasons explaining the personalization decision */
  personalization_reasons?: string[];
}

// ---------------------------------------------------------------------------
// History (client-side, localStorage) — V1
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

// ---------------------------------------------------------------------------
// Auth — V2
// ---------------------------------------------------------------------------

export interface UserPreferencesResponse {
  sensitivity: SensitivityLevel;
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

export interface GoogleAuthStartResponse {
  auth_url: string;
  state: string;
}

// ---------------------------------------------------------------------------
// History — V2 (server-backed)
// ---------------------------------------------------------------------------

export interface FeedbackSummary {
  feedback_label: string;
  reason: string | null;
  created_at: string;
}

export interface HistoryItemResponse {
  id: string;
  source: "manual" | "gmail";
  subject: string | null;
  sender: string | null;
  final_prediction: PredictionLabel;
  final_risk_score: number;
  risk_band: RiskBand;
  personalized: boolean;
  saved_at: string;
}

export interface HistoryDetailResponse extends HistoryItemResponse {
  review_state: string | null;
  personalization_reasons: string[] | null;
  agreement_ratio: number;
  model_version: string;
  feedback: FeedbackSummary[];
}

export interface HistoryListResponse {
  items: HistoryItemResponse[];
  next_cursor: string | null;
  total_count: number | null;
}

export interface ClearHistoryResponse {
  deleted_count: number;
}

export interface HistoryQueryParams {
  cursor?: string;
  limit?: number;
  source?: "manual" | "gmail";
  verdict?: "spam" | "not_spam" | "review";
  query?: string;
}

// ---------------------------------------------------------------------------
// Feedback — V2
// ---------------------------------------------------------------------------

export type FeedbackLabel =
  | "correct_spam"
  | "correct_safe"
  | "false_positive"
  | "false_negative"
  | "not_sure";

export interface RuleSuggestion {
  /** One of: trust_sender, block_sender, trust_domain, block_domain */
  type: string;
  /** The sender address or domain being suggested */
  value: string;
  /** Human-readable reason for the suggestion */
  suggested: string;
}

export interface SubmitFeedbackResponse {
  success: boolean;
  feedback_id: string;
  rule_suggestion: RuleSuggestion | null;
}

// ---------------------------------------------------------------------------
// Preferences & Rules — V2
// ---------------------------------------------------------------------------

export type SensitivityLevel = "relaxed" | "balanced" | "strict";
export type RuleAction = "trust" | "block";

export interface PreferencesResponse {
  sensitivity: SensitivityLevel;
  personalization_enabled: boolean;
  review_band_enabled: boolean;
}

export interface PreferencesUpdate {
  sensitivity?: SensitivityLevel;
  personalization_enabled?: boolean;
  review_band_enabled?: boolean;
}

export interface SenderRule {
  id: string;
  sender: string;
  action: RuleAction;
  created_at: string;
}

export interface DomainRule {
  id: string;
  domain: string;
  action: RuleAction;
  created_at: string;
}

export interface RulesResponse {
  senders: SenderRule[];
  domains: DomainRule[];
}

export interface AddRuleResponse {
  id: string;
  sender?: string;
  domain?: string;
  action: RuleAction;
}

// ---------------------------------------------------------------------------
// Gmail — V2
// ---------------------------------------------------------------------------

export interface GmailStatusResponse {
  connected: boolean;
  email: string | null;
  scopes: string[];
  connected_at: string | null;
}

export interface GmailMessageItem {
  gmail_message_id: string;
  thread_id: string;
  subject: string | null;
  from_address: string | null;
  snippet: string | null;
  received_at: string;
  has_attachments: boolean;
}

export interface GmailMessagesResponse {
  items: GmailMessageItem[];
  next_cursor: string | null;
}

export interface GmailClassifyResult {
  history_id: string;
  source: "gmail";
  message: {
    gmail_message_id: string;
    subject: string | null;
    from_address: string | null;
  };
  result: {
    final_prediction: PredictionLabel;
    final_risk_score: number;
    risk_band: RiskBand;
    review_state: string | null;
    personalized: boolean;
    personalization_reasons: string[] | null;
  };
}

export interface GmailBatchClassifyResponse {
  results: GmailClassifyResult[];
}

export interface GmailMessagesParams {
  cursor?: string;
  limit?: number;
  label?: string;
  q?: string;
}

// ---------------------------------------------------------------------------
// Insights — V2
// ---------------------------------------------------------------------------

export interface DomainCount {
  domain: string;
  count: number;
}

export interface InsightsSummary {
  total_classifications: number;
  spam_detected: number;
  safe_detected: number;
  review_count: number;
  false_positive_count: number;
  false_negative_count: number;
  top_flagged_domains: DomainCount[];
}

// ---------------------------------------------------------------------------
// Personalization — V2
// ---------------------------------------------------------------------------

export type PersonalizationSource =
  | "global_model"
  | "sensitivity_threshold"
  | "sender_override"
  | "domain_override"
  | "feedback_adjustment";

export interface PersonalizationResult {
  personalized: boolean;
  review_state: ReviewState;
  personalization_reasons: string[];
  applied_sources: PersonalizationSource[];
  final_prediction: PredictionLabel;
  final_risk_score: number;
}
