# SECURITY_PRIVACY_V2.md

V2 introduces user accounts and Gmail integration, so security and privacy become first-class requirements.

## Security goals

- protect account identity and sessions
- protect OAuth tokens
- minimize stored email content
- preserve user control over connected accounts and saved data
- prevent V2 from weakening V1 stability

---

## Core principles

### 1. Least privilege
Request the minimum Gmail scopes needed for the implemented feature set.

Start with read-oriented scopes only.

### 2. Data minimization
Do not store more email content than needed.

### 3. Explicit control
Users must be able to:
- disconnect Gmail
- sign out
- clear history
- reset personalization
- delete their account/data

### 4. Explainability
Users should understand when the system relied on:
- the global model
- their threshold setting
- a trust/block rule
- personalization adjustment

### 5. Safe defaults
V2 should be privacy-safe even if the user never changes settings.

---

## Authentication security

- use secure session cookies or a strongly validated token-based session system
- CSRF protection where needed
- state verification for OAuth flows
- rotate/expire sessions appropriately
- do not log sensitive session data

---

## Gmail token handling

- never commit OAuth secrets
- store tokens encrypted at rest
- support refresh-token handling safely
- revoke or forget tokens on disconnect where possible
- keep token access centralized in dedicated services

---

## Email content retention policy

### Recommended default
Persist:
- sender
- subject
- snippet/preview
- verdict/score
- metadata required for history and insights

Avoid indefinite storage of:
- full raw bodies
- full HTML bodies
- attachments
- unnecessary headers

### Optional richer storage
If richer storage is ever added:
- make it explicit and opt-in
- document retention duration
- expose deletion control

---

## Logging policy

### Allowed
- request IDs
- route names
- timing
- model version
- score ranges
- non-sensitive metadata counts

### Avoid
- raw email bodies in logs
- OAuth tokens
- full Gmail payloads
- personally sensitive identifiers beyond what is necessary

---

## Personalization privacy

Personalization should primarily rely on:
- user feedback labels
- sender/domain rules
- compact aggregate profile values

Do not turn the app into a raw personal email archive just to support personalization.

---

## Account deletion requirements

Account deletion should remove or anonymize:
- user record
- active sessions
- Gmail connection metadata/tokens
- feedback
- rules
- personalization profile
- history records as product policy dictates

If full hard-delete is not possible immediately, document the policy clearly and implement the safest available deletion/anonymization path.

---

## Disconnect Gmail requirements

On disconnect:
- revoke tokens where possible
- remove stored token material
- mark Gmail as disconnected
- prevent future message fetches
- keep or delete prior Gmail-derived history according to product policy and user choice

---

## Frontend privacy UX requirements

The UI should clearly communicate:
- what data is stored
- whether Gmail is connected
- whether personalization is enabled
- how to clear/reset/delete data

---

## Sensitive environments

The app must still behave safely when:
- Gmail credentials are missing
- DB is missing
- token refresh fails
- Gmail API is temporarily unavailable

Do not leak partial sensitive data during failures.

---

## Release checklist

Before considering V2 ready:
- OAuth secrets are env-only
- token encryption exists
- disconnect flow works
- history clear/reset works
- privacy text is updated
- logs are checked for sensitive leakage
