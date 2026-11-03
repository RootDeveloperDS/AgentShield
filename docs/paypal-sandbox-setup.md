# PayPal Sandbox Setup & Webhook Verification

AgentShield integrates with PayPal's REST API v2 and OAuth 2.0 gateway for payment execution and asynchronous webhook reconciliation.

---

## 1. Developer Portal Setup

1. Sign in to the [PayPal Developer Dashboard](https://developer.paypal.com/).
2. Navigate to **Apps & Credentials** and ensure the mode toggle is set to **Sandbox**.
3. Click **Create App**:
   * **App Name:** `AgentShield`
   * **App Type:** `Merchant`
4. Copy the credentials into `backend/.env`:
   ```env
   PAYPAL_ENV=sandbox
   PAYPAL_CLIENT_ID=your_sandbox_client_id_here
   PAYPAL_CLIENT_SECRET=your_sandbox_client_secret_here
   ```
5. Copy the Client ID into `frontend/.env.local`:
   ```env
   NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_sandbox_client_id_here
   ```

---

## 2. Webhook Configuration

1. In your PayPal Sandbox app settings, scroll down to the **Webhooks** section.
2. Click **Add Webhook**.
3. **Webhook URL:** Enter your server endpoint (e.g., `https://your-domain.com/api/paypal/webhooks` or your tunneling URL during local development).
4. **Subscribed Events:**
   * `Payment capture completed` (`PAYMENT.CAPTURE.COMPLETED`)
   * `Payment capture denied` (`PAYMENT.CAPTURE.DENIED`)
   * `Checkout order approved` (`CHECKOUT.ORDER.APPROVED`)
   * `Checkout order cancelled` (`CHECKOUT.ORDER.CANCELLED`)
5. Save the webhook and copy the generated **Webhook ID** into `backend/.env`:
   ```env
   PAYPAL_WEBHOOK_ID=4JH1234567890ABC
   ```

---

## 3. Webhook Signature Verification

AgentShield enforces authoritative server-to-server cryptographic verification for every incoming webhook:

1. **Header Validation:** The receiver checks for the 5 mandatory PayPal transmission headers (`paypal-auth-algo`, `paypal-cert-url`, `paypal-transmission-id`, `paypal-transmission-sig`, `paypal-transmission-time`).
2. **Official Verification API:** The backend calls PayPal's `/v1/notifications/verify-webhook-signature` endpoint using the server OAuth token and configured `PAYPAL_WEBHOOK_ID`.
3. **Database Idempotency:** The unique `id` of each verified webhook event is stored in PostgreSQL (`WebhookEvent` table). If PayPal retries transmission of an already-processed event, AgentShield returns `200 OK` with `status: "DUPLICATE_EVENT_IGNORED"` without executing duplicate state transitions.
4. **State Transition:** Upon verified `PAYMENT.CAPTURE.COMPLETED`, the correlated `PaymentIntent` is transitioned to `COMPLETED` and an immutable `AuditEvent` is recorded.
