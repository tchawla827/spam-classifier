# PRD_V2.md

## Product name
SpamShield V2

## Product vision
A spam classifier that learns the user's inbox behavior without replacing the underlying global model.

## Product statement
V1 proves that the app can classify email text well.  
V2 must make the app feel like a real assistant by adding identity, Gmail, history, feedback, and personalization.

---

## Primary users

### 1. Casual user
Wants to paste suspicious emails and get a clear answer.

### 2. Gmail-connected user
Wants to connect Gmail and review real emails inside the app.

### 3. Power user
Wants control over trusted senders, blocked domains, and sensitivity.

---

## Problem statement

V1 can classify a single pasted email, but it lacks:
- persistent account-based history
- inbox connection
- user correction loop
- personalization
- continuity across sessions/devices

This makes it a strong demo, but not yet a sticky product.

---

## Goals

### G1
Support authenticated users with persistent, account-based classification history.

### G2
Allow users to connect Gmail and classify real messages within the app.

### G3
Collect user feedback on classifications.

### G4
Add personalization that adapts to the user's preferences without retraining the whole model.

### G5
Preserve the existing V1 manual classification flow.

### G6
Remain privacy-conscious by default.

---

## Non-goals for initial V2

- full per-user retraining of the global model
- Outlook or Yahoo support
- automatic destructive Gmail write actions by default
- enterprise multi-user admin features
- team/shared inbox features
- full fine-tuning infrastructure

---

## Core user stories

### Authentication
- As a user, I want to sign in so my history follows me across devices.
- As a user, I want to sign out and disconnect my account safely.

### History
- As a user, I want a sidebar of my past classifications.
- As a user, I want to reopen any past result.
- As a user, I want to search/filter my history.

### Gmail
- As a user, I want to connect Gmail.
- As a user, I want to see recent emails in the app.
- As a user, I want to classify a single email or multiple selected emails.

### Feedback
- As a user, I want to tell the app when it was wrong.
- As a user, I want my feedback to improve future decisions.

### Personalization
- As a user, I want stricter or looser spam sensitivity.
- As a user, I want to always trust specific senders/domains.
- As a user, I want to always distrust specific senders/domains.
- As a user, I want the app to explain whether a result was changed because of my preferences.

### Privacy
- As a user, I want control over what is saved.
- As a user, I want to clear history and reset my personalization.

---

## Success criteria

### Product success
- authenticated users can return and see history
- Gmail-connected users can classify real emails
- feedback is captured and visible in the product loop
- personalization changes future outcomes in understandable ways
- V1 manual classification remains fully operational

### Engineering success
- no regressions to current V1 API contracts
- migrations are stable
- Gmail integration is modular
- privacy defaults are conservative
- tests cover both legacy and V2 flows

---

## Functional requirements

### FR1: Authentication
- support Google sign-in
- support session persistence
- user profile endpoint
- sign out flow

### FR2: Account-bound history
- store user classifications in DB
- show paginated/filterable history
- anonymous fallback remains available

### FR3: Gmail connection
- connect Gmail via OAuth
- store tokens securely
- fetch recent messages
- select and classify messages

### FR4: Feedback
- feedback options per classification:
  - correct spam
  - correct safe
  - false positive
  - false negative
  - not sure
- support undo/edit latest feedback

### FR5: Rules
- trust sender
- trust domain
- block sender
- block domain
- optional keyword preferences later

### FR6: Sensitivity setting
- relaxed
- balanced
- strict

### FR7: Personalization engine
- accept global score and context
- apply user threshold
- apply rule overrides
- apply feedback-based correction
- produce final decision metadata

### FR8: Dashboard
- user-level summary stats
- common spam categories
- feedback trend
- false positive/negative insight
- rule impact

### FR9: Privacy controls
- disconnect Gmail
- clear history
- reset personalization
- delete user data/account
- retention-safe defaults

---

## UX requirements

- landing page remains premium and uncluttered
- auth entry points should feel natural, not intrusive
- history sidebar should feel fast and contextual
- Gmail view should not overwhelm the user
- feedback controls should be obvious but lightweight
- explanation UI should separate:
  - model signal
  - rule override
  - personalization adjustment

---

## Priorities

### P0
- auth
- sessions
- user DB model
- per-user history
- Gmail connect/read/classify
- feedback
- sender/domain rules
- sensitivity settings

### P1
- personalization adjustment layer
- review band
- history filters/search
- dashboard basics
- rule suggestions

### P2
- Gmail write-back actions
- advanced insights
- bulk workflows
- richer personalization analytics
