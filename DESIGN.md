# AgentShield — Design Document

## 1. Purpose

AgentShield is a verification proxy for AI-to-AI payments. It aims to reduce payment misdirection, agent impersonation, tampered payment requests, and replay attacks by validating agent identity and transaction intent before payment execution.

**Tagline:** Verify the agent. Validate the intent. Secure the payment.

## 2. Design principles

- **Verify before paying:** no payment execution before identity, intent, and policy checks.
- **Deterministic security:** security decisions are made by explicit rules, not an LLM.
- **Least privilege:** services receive only the permissions and secrets they need.
- **Replay resistance:** signed requests have unique nonces and expiration times.
- **Auditable decisions:** allow/deny outcomes and meaningful security events are recorded.
- **Honest payment state:** payment success is reported only after authoritative PayPal evidence.
- **Incremental development:** preserve the existing application and finish Part 1 before proceeding to Part 2.

## 3. High-level architecture

```text
Frontend / Dashboard
        |
        v
Existing JavaScript API Backend
        |
        +--> Agent Registry
        +--> Cryptographic Verification Service
        +--> Signed Intent Validator
        +--> Deterministic Policy Engine
        +--> Nonce / Replay Protection
        +--> Transaction State and Audit Service
        |
        +--> Part 2: PayPal API Adapter
                    |
                    +--> OAuth access token
                    +--> Orders API
                    +--> Buyer approval
                    +--> Server-side capture
                    +--> Webhook verification
        |
        v
Existing Database
```

Keep the repository's existing frontend, JavaScript backend, database, and established conventions. Do not migrate the backend to Python or replace the UI without an explicit requirement.

## 4. Part 1 — security foundation

### Agent registry

Store each agent's stable identifier, public key, status, key metadata, and relevant timestamps. Support revocation. Private keys must never be stored by the registry.

### Challenge-response

Issue a short-lived, unpredictable challenge. Verify the agent's Ed25519 signature over a well-defined, unambiguous message. Reject expired or reused challenges. Bind the challenge to the intended agent and protocol context.

### Signed payment intent

The signed payload should have a canonical, documented representation and include at least:

- Unique intent ID
- Payer and intended recipient agent IDs
- Service or purpose
- Amount and currency
- Issued-at and expiration timestamps
- Unique nonce
- Any policy-relevant context

Validate the signature against the registered, active public key. Validate every security-sensitive field and ensure the verified values are the same values used downstream. Do not verify one representation and execute a separately supplied amount or recipient.

### Replay protection

Enforce nonce uniqueness and intent state in persistent storage. Make the check-and-record operation atomic where possible. A previously accepted nonce or consumed intent must not authorize another payment.

### Deterministic policy engine

Evaluate explicit rules such as permitted recipients, currency restrictions, maximum transaction amount, agent spending limits, risk flags, and human-approval thresholds. Return a structured allow, deny, or approval-required decision with reason codes. Fail closed when required security information is missing.

### Audit and state

Record verification outcomes, policy decisions, state transitions, and relevant correlation IDs. Avoid logging secrets, tokens, private keys, or unnecessary sensitive data. Use an explicit transaction state machine to prevent duplicate execution and invalid transitions.

## 5. Part 2 — PayPal payment lifecycle

Only implement this phase after Part 1 is verified complete, unless the existing repository already contains relevant work that must be preserved.

1. Re-run verification and policy checks immediately before order creation.
2. Create a PayPal Orders API order on the server using verified intent values.
3. Return only the required approval information to the frontend.
4. Obtain buyer approval using the PayPal JavaScript SDK when required.
5. Capture on the server and validate the response.
6. Verify webhook signatures using PayPal's supported verification process.
7. Reconcile asynchronous events and duplicate notifications idempotently.
8. Issue a receipt only when the payment state is supported by verified PayPal evidence.

Use PayPal Sandbox by default during development. Do not represent local mocks or simulated responses as real PayPal payments.

## 6. Data and money handling

- Use the existing database and migration system.
- Do not delete or recreate data as a shortcut.
- Store monetary values using integer minor units or a decimal-safe representation with currency-specific precision.
- Never use binary floating-point arithmetic for payment amounts.
- Use idempotency controls for operations that may be retried.
- Define retention and access rules for audit data.

## 7. Threat model

| Threat | Primary control |
|---|---|
| Agent impersonation | Registered public keys and signature verification |
| Intent tampering | Signature over canonical intent fields |
| Replay attack | Expiry, unique nonce, atomic consumption |
| Revoked key use | Check key status at verification time |
| Unauthorized recipient or amount | Deterministic policy checks against signed fields |
| Duplicate order/capture | Idempotency and transaction state machine |
| Forged payment confirmation | Verified PayPal response and webhook verification |
| Secret leakage | Server-side secret storage and redacted logs |
| LLM manipulation | LLM cannot override allow/deny policy or access payment secrets |

A compromised agent may still possess a valid key. Key possession alone does not prove software integrity or legitimate intent; limits, approvals, revocation, and monitoring remain necessary.

## 8. Testing strategy

- Unit tests for signature validation, canonicalization, expiry, nonce handling, and policy rules.
- Negative tests for malformed signatures, wrong recipients, altered amounts, expired intents, revoked keys, and replay attempts.
- Integration tests for API routes and persistence.
- PayPal adapter tests using a controlled HTTP mock, clearly distinguished from real Sandbox tests.
- End-to-end tests for critical frontend flows where the existing project supports them.
- A documented manual Sandbox test for order creation, approval, capture, and webhook handling.

## 9. Implementation sequence

1. Inspect the actual repository and original prompts.
2. Inventory completed, partial, missing, and broken Part 1 work.
3. Finish the foundational services and tests without replacing working code.
4. Verify frontend/backend startup and security rejection cases.
5. Document Part 1 completion and remaining blockers.
6. Begin or complete Part 2 only after the Part 1 gate is satisfied.
