# API quick reference

Base URL: `http://localhost:4000`

- `GET /health`
- `GET /api/agents`
- `POST /api/agents` body: `{ "id": "...", "name": "...", "publicKey": "-----BEGIN PUBLIC KEY-----..." }`
- `POST /api/intents/verify` body: `{ "intent": { ...canonical intent fields... }, "signatureBase64": "..." }`
- `GET /api/approvals`
- `POST /api/approvals/:intentId` body: `{ "approved": true }`
- `GET /api/transactions`
- `POST /api/paypal/orders` body: `{ "intentId": "..." }`
- `POST /api/paypal/orders/:orderId/capture`
- `GET /api/audit`

Payment endpoints require server-side PayPal Sandbox credentials. Do not expose credentials to the frontend.
