# Execution Rules for Claude Code

## 1. Core Principles
- Build incrementally
- Prefer small safe changes
- Keep files focused
- Keep architecture consistent with docs
- Do not invent extra scope unless explicitly approved
- Do not replace agreed stack choices without reason

---

## 2. Scope Rules
### Required
- email-only classification
- subject + body input
- ensemble model outputs
- final ensemble result
- dark premium UI
- anonymous-first V1
- Gmail-ready architecture, not forced full implementation in V1

### Not allowed in early implementation
- SMS mode
- transformer serving in V1
- browser extension
- Gmail auto-sync
- storing raw Gmail content by default
- label-writing to user inbox
- major architecture rewrites without strong reason

---

## 3. Coding Style Rules
### General
- prefer readability over cleverness
- prefer explicit naming
- keep functions short and single-purpose
- avoid premature abstraction
- avoid dead code
- document only where it adds clarity

### Python
- use type hints
- use Pydantic for request/response contracts
- keep business logic out of route handlers
- use services for orchestration
- raise clear exceptions
- no silent pass blocks

### TypeScript / React
- use strict typing
- use functional components
- keep presentational and logic concerns separated
- avoid massive page files
- move repeated logic into hooks or lib utilities

---

## 4. File Size Guidance
- target small-to-medium files
- if a file grows beyond ~250-300 lines, consider splitting it
- route handlers should remain especially small
- UI components should usually do one thing well

---

## 5. Architecture Constraints
- frontend must talk only to backend API, never directly to ML training code
- backend runtime must use exported artifacts, not training scripts
- offline training and online inference must remain separate concerns
- future Gmail integration must be additive, not disruptive

---

## 6. API Rules
- all API responses must be structured and predictable
- never return ad hoc shapes for the same endpoint
- use explicit error formats
- validate inputs strictly
- keep versioned routes under `/api/v1`

---

## 7. Security and Privacy Rules
- never log raw tokens
- never log full email bodies in production-oriented code
- do not store raw Gmail content by default
- assume OAuth tokens must be encrypted at rest when introduced
- keep secrets in environment variables only
- do not hardcode secrets, callback URLs, or credentials

---

## 8. ML Rules
- classical ML first
- keep preprocessing deterministic
- avoid data leakage
- calibrate probabilities before exposing confidence
- do not call raw SVM scores “confidence”
- preserve model version metadata
- save reproducible training outputs
- keep dataset adapters isolated

---

## 9. UI Rules
- style direction is dark premium cybersecurity
- avoid clutter
- prefer clear hierarchy and whitespace
- use restrained animations
- risk colors must remain semantically meaningful
- loading, empty, success, and error states are mandatory

---

## 10. Testing Rules
- every major module should have at least smoke-level coverage
- critical API contracts must be tested
- inference output structure must be tested
- validate both happy path and invalid input path
- tests should be fast enough to run often

---

## 11. Dependency Rules
- add dependencies only when necessary
- prefer mature widely used libraries
- do not introduce overlapping libraries for the same job
- keep free-tier deployment constraints in mind

---

## 12. Documentation Rules
- update docs when architecture meaningfully changes
- do not let code drift far from documented design
- keep README accurate
- keep examples copy-pasteable

---

## 13. Git / Change Management Rules
- make focused commits
- one feature or fix per coherent change
- do not mix unrelated refactors with feature work
- avoid broad renames unless necessary

---

## 14. Decision-Making Rules for Claude Code
When uncertain:
1. choose the simpler implementation that preserves architecture
2. choose the safer implementation for privacy/security
3. choose the more modular path
4. avoid expanding scope
5. leave clear TODOs for deferred work instead of partially implementing risky features

---

## 15. Definition of Done
A task is done only if:
- code compiles/runs
- types pass
- tests pass for touched modules where applicable
- docs remain accurate
- no obvious scope drift was introduced
