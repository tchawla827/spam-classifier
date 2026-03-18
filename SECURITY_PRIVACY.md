# Security and Privacy Decisions

## 1. Purpose
Keep the project production-style and Gmail-ready without creating unsafe defaults.

---

## 2. V1 Security Posture
- anonymous use allowed
- no Gmail tokens
- no raw mailbox access
- local history by default
- backend stores minimal metadata only if persistence is enabled

---

## 3. Input Handling
- trim whitespace
- reject fully empty inputs
- set reasonable maximum request size
- sanitize any rendered text in frontend
- never render untrusted HTML

---

## 4. Logging Rules
Allowed in logs:
- request ID
- status code
- latency
- model version
- top-level result metadata

Not allowed in logs:
- full email body
- raw OAuth tokens
- refresh tokens
- sensitive user secrets

---

## 5. Persistence Rules
### Safe to persist in V1
- request ID
- subject preview
- body hash
- final prediction
- risk score
- model version
- timestamp

### Do not persist by default
- full raw email body
- full Gmail message content
- attachments
- plaintext tokens

---

## 6. Gmail Future Rules
When Gmail is introduced:
- require login
- store tokens server-side only
- encrypt tokens at rest
- request minimal scopes only
- provide disconnect/revoke flow
- do not auto-sync entire inbox without clear consent
- classify selected messages first before considering bulk workflows

---

## 7. Secrets Management
- all secrets in environment variables
- never commit secrets
- provide `.env.example`
- use separate values per environment

---

## 8. Error Handling
- fail safely
- do not leak internal exception traces to users
- return structured error objects
- log internal errors with redaction

---

## 9. Deployment Safety
- enable HTTPS in deployed environments
- configure CORS intentionally
- restrict callback URLs when OAuth is added
- keep dependencies updated enough for security hygiene

---

## 10. Privacy Principle
Collect and store the minimum necessary data required for the feature to work.
