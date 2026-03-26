# DATASET_V2.md

This file describes the new V2 data assets needed for user personalization and product analytics.

## Important distinction

V2 does **not** replace the current global spam dataset/training pipeline.

Instead, it introduces new user-derived data layers:

1. account data
2. classification history data
3. feedback data
4. rule data
5. lightweight personalization profile data

---

## Existing global data remains

The current public email training corpus and exported bundle remain the source of the **global model**.

Do not fold user data directly into the main global training process for initial V2.

---

## New V2 data categories

## 1. User account data
Purpose:
- identity
- session ownership
- account preferences

Examples:
- email
- display name
- avatar URL
- created at
- last login at

---

## 2. Classification event data
Purpose:
- per-user history
- dashboard stats
- personalization context

Recommended fields:
- `id`
- `user_id`
- `source` (`manual`, `gmail`)
- `request_subject`
- `request_body_preview` or redacted preview
- `sender_email`
- `sender_domain`
- `gmail_message_id` nullable
- `global_prediction`
- `global_score`
- `final_prediction`
- `final_score`
- `risk_band`
- `review_state`
- `personalized`
- `personalization_reasons`
- `model_version`
- `created_at`

### Privacy note
Avoid storing full raw email bodies indefinitely by default.

---

## 3. Feedback data
Purpose:
- learn from user corrections
- power suggestions
- feed personalization layer

Recommended fields:
- `id`
- `user_id`
- `classification_event_id`
- `feedback_label`
- `reason` nullable
- `created_at`
- `updated_at`

Labels:
- `correct_spam`
- `correct_safe`
- `false_positive`
- `false_negative`
- `not_sure`

---

## 4. Override rule data
Purpose:
- hard user preferences
- clear explainable overrides

### Sender override fields
- `id`
- `user_id`
- `sender_email`
- `action` (`trust`, `block`)
- `created_at`

### Domain override fields
- `id`
- `user_id`
- `domain`
- `action` (`trust`, `block`)
- `created_at`

---

## 5. User preference data
Purpose:
- soft personalization settings

Recommended fields:
- `user_id`
- `sensitivity` (`relaxed`, `balanced`, `strict`)
- `personalization_enabled`
- `review_band_enabled`
- `updated_at`

---

## 6. Personalization profile data
Purpose:
- compact, derived representation of user behavior
- avoid full retraining

Recommended fields:
- `user_id`
- `feedback_count`
- `false_positive_rate`
- `false_negative_rate`
- `sender_trust_bias`
- `promo_tolerance_bias`
- `phishing_strictness_bias`
- `last_recomputed_at`

This profile can be recomputed from feedback + history rather than manually edited.

---

## Derived features for personalization

The personalization layer may compute features such as:
- sender previously trusted
- domain previously blocked
- sender has repeated false-positive feedback
- domain has repeated false-negative feedback
- user tends to accept newsletter-like content
- user tends to block finance/crypto offers
- current global confidence band
- model disagreement
- message source (`manual` vs `gmail`)

---

## Safe retention policy recommendation

### Keep
- verdicts
- scores
- sender/domain info
- timestamps
- feedback labels
- rules
- aggregate profile values

### Limit / redact / expire
- raw full bodies
- full HTML bodies
- full attachment content
- unnecessary Gmail metadata

### Recommended default
Store:
- subject
- sender
- short preview/snippet
- derived classification metadata
- feedback and rule data

Add explicit opt-in if richer retention is needed later.

---

## How personalization should learn

## Phase 1 personalization
Use deterministic logic:
- hard rules
- sensitivity thresholds

## Phase 2 personalization
Use lightweight learned adjustments:
- score offsets based on repeated feedback
- sender/domain familiarity bias
- repeated false-positive/negative correction patterns

## Not recommended initially
- per-user deep retraining
- online fine-tuning of the full global ensemble
- storing large user-specific raw corpora

---

## Evaluation data for V2

You should also create internal evaluation fixtures for:
- trusted sender false positives
- blocked domain false negatives
- newsletter vs phishing ambiguity
- medium-confidence review cases
- user-specific override cases

These can live in test fixtures rather than the main ML dataset.
