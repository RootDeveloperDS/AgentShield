# AgentShield

**Verify the agent. Validate the intent. Secure the payment.**

AgentShield is a security proxy concept for AI-to-AI payments. Before a payment is executed, it verifies the receiving agent's registered identity, validates a signed payment intent, applies deterministic policy checks, and records an auditable decision. PayPal Sandbox payment execution belongs to the later integration phase.

## Project status and scope

This repository's implementation may be incomplete. Use this documentation alongside the existing code and original Part 1 / Part 2 prompts. Inspect the current workspace before making changes; continue from the actual state rather than rebuilding the application.

- **Part 1:** foundational identity verification, signed intents, replay protection, deterministic policy checks, audit records, and relevant tests.
- **Part 2:** PayPal integration and end-to-end payment flow, only after Part 1 is verified complete.
- **Backend:** keep the existing JavaScript/Node.js backend. Do not migrate it to Python.
- **Frontend:** preserve the existing frontend framework, UI, and working functionality.
- **Database:** preserve existing data and migrations; do not reset or destructively recreate the database.

## Core security flow

1. Register an agent and associate it with a public key.
2. Verify a challenge-response signature to demonstrate control of the registered private key.
3. Validate a signed payment intent, including recipient, service, amount, currency, expiry, and unique nonce.
4. Reject expired, malformed, unauthorized, revoked-key, or replayed intents.
5. Apply deterministic policy rules such as allowed recipients, spending limits, and required buyer approval.
6. Record the decision and relevant security events in an audit trail.
7. In Part 2, create and capture a real PayPal Sandbox order only after required checks and buyer approval.

A valid signature proves control of a key, not that the agent's software is honest or uncompromised. AI-generated explanations must never override deterministic security decisions.

## Development guidance

- Inspect the repository, current Git status, existing specifications, routes, services, database schema, and tests before editing.
- Preserve existing changes and working features.
- Do not invent success responses or claim a payment succeeded without verified PayPal evidence.
- Use integer minor units or decimal-safe currency handling; never use binary floating point for money calculations.
- Keep secrets server-side, use environment variables, and never log credentials or access tokens.
- Add tests for both allowed and rejected security cases.
- Mark a task complete only after implementation and relevant tests have been verified.

## Configuration

Follow the existing application's configuration conventions. Keep a local `.env` file out of version control. If the project does not already provide one, add an `.env.example` containing placeholder values only.

For the later PayPal Sandbox phase, typical server-side settings include:

```env
PAYPAL_ENV=sandbox
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_WEBHOOK_ID=
```

Never commit real credentials. The frontend may use a public PayPal client ID if required, but must never receive the PayPal client secret.

## Local development

Use the existing project's package manager and scripts. Inspect `package.json` and the current documentation before assuming command names. Typical commands may resemble:

```bash
npm install
npm run dev
npm test
```

These are examples only; use the scripts actually defined in the repository.

## Completion checklist

- [ ] Existing repository and original requirements inspected
- [ ] Part 1 gaps identified and implemented
- [ ] Identity and signature verification tested
- [ ] Intent expiry, nonce uniqueness, and replay prevention tested
- [ ] Deterministic policy decisions and rejection cases tested
- [ ] Audit trail and transaction state handling verified
- [ ] Frontend and backend startup/build checks pass
- [ ] Part 1 completion report documents remaining issues honestly
- [ ] Part 2 begins only after Part 1 is verified
