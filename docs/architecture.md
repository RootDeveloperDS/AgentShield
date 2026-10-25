# Architecture

- Next.js frontend: dashboard and administrative screens.
- Express API: agent registration, signed intent verification, policy evaluation, approval decisions, transaction history, audit events, and PayPal order/capture endpoints.
- PostgreSQL + Prisma: persistent agents, intents, audit events, and webhook event IDs.
- Node.js `crypto`: Ed25519 key generation, signing helpers for tests/development, and signature verification.

Security boundaries:
- Payment intent signature binds all canonicalized fields.
- Intent ID and nonce are persisted with uniqueness constraints.
- Policy decision is separate from PayPal payment state.
- PayPal credentials are server-only.

This is a starter architecture. Administrative route authentication, production rate limiting, full webhook endpoint implementation, daily cumulative spend accounting, and a formal security review are required before production use.
