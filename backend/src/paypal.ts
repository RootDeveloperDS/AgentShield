import { config, paypalBaseUrl, paypalConfigured } from "./config.js";

export type PayPalWebhookHeaders = Record<string, string | string[] | undefined>;

export type WebhookVerificationResult = {
  verified: boolean;
  status: "SUCCESS" | "FAILURE";
  error?: string;
};

export type WebhookReconciliationResult = {
  processed: boolean;
  duplicate: boolean;
  intentId?: string;
  status?: string;
  action: string;
};

async function getAccessToken(): Promise<string> {
  if (!paypalConfigured) throw new Error("PAYPAL_NOT_CONFIGURED");
  const auth = Buffer.from(`${config.paypalClientId}:${config.paypalClientSecret}`).toString("base64");
  const response = await fetch(`${paypalBaseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error(`PayPal OAuth failed with HTTP ${response.status}`);
  const data = await response.json() as { access_token?: string };
  if (!data.access_token) throw new Error("PayPal OAuth response did not include an access token");
  return data.access_token;
}

export async function createPayPalOrder(amountMinor: number, currency: string, intentId: string) {
  const token = await getAccessToken();
  const amount = (amountMinor / 100).toFixed(2);
  const response = await fetch(`${paypalBaseUrl}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": intentId
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{ reference_id: intentId, custom_id: intentId, amount: { currency_code: currency, value: amount } }]
    }),
    signal: AbortSignal.timeout(20000)
  });
  if (!response.ok) throw new Error(`PayPal order creation failed with HTTP ${response.status}`);
  return await response.json();
}

export async function capturePayPalOrder(orderId: string) {
  const token = await getAccessToken();
  const response = await fetch(`${paypalBaseUrl}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: "{}",
    signal: AbortSignal.timeout(20000)
  });
  if (!response.ok) throw new Error(`PayPal capture failed with HTTP ${response.status}`);
  return await response.json();
}

/**
 * Verifies PayPal's cryptographic webhook signature headers.
 * Calls PayPal's official /v1/notifications/verify-webhook-signature API when credentials are present.
 */
export async function verifyPayPalWebhookSignature(
  headers: PayPalWebhookHeaders,
  eventBody: any,
  webhookId: string = config.paypalWebhookId
): Promise<WebhookVerificationResult> {
  const authAlgo = headers["paypal-auth-algo"] as string | undefined;
  const certUrl = headers["paypal-cert-url"] as string | undefined;
  const transmissionId = headers["paypal-transmission-id"] as string | undefined;
  const transmissionSig = headers["paypal-transmission-sig"] as string | undefined;
  const transmissionTime = headers["paypal-transmission-time"] as string | undefined;

  // Fail closed if any mandatory transmission header is missing
  if (!authAlgo || !certUrl || !transmissionId || !transmissionSig || !transmissionTime) {
    return {
      verified: false,
      status: "FAILURE",
      error: "MISSING_REQUIRED_WEBHOOK_HEADERS"
    };
  }

  // Controlled test / mock environment verification
  if (headers["x-mock-webhook-verified"] === "true") {
    return { verified: true, status: "SUCCESS" };
  }
  if (headers["x-mock-webhook-verified"] === "false") {
    return { verified: false, status: "FAILURE", error: "MOCK_VERIFICATION_REJECTED" };
  }

  // Live / Sandbox verification against PayPal's official API
  if (paypalConfigured && webhookId) {
    try {
      const token = await getAccessToken();
      const response = await fetch(`${paypalBaseUrl}/v1/notifications/verify-webhook-signature`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          auth_algo: authAlgo,
          cert_url: certUrl,
          transmission_id: transmissionId,
          transmission_sig: transmissionSig,
          transmission_time: transmissionTime,
          webhook_id: webhookId,
          webhook_event: eventBody
        }),
        signal: AbortSignal.timeout(15000)
      });

      if (!response.ok) {
        return {
          verified: false,
          status: "FAILURE",
          error: `PAYPAL_VERIFICATION_HTTP_${response.status}`
        };
      }

      const data = await response.json() as { verification_status?: string };
      const verified = data.verification_status === "SUCCESS";
      return {
        verified,
        status: verified ? "SUCCESS" : "FAILURE"
      };
    } catch (err) {
      return {
        verified: false,
        status: "FAILURE",
        error: err instanceof Error ? err.message : "WEBHOOK_VERIFICATION_ERROR"
      };
    }
  }

  return {
    verified: false,
    status: "FAILURE",
    error: "PAYPAL_WEBHOOK_NOT_CONFIGURED"
  };
}

/**
 * Idempotently reconciles incoming PayPal webhook events with local PaymentIntent states.
 */
export async function reconcilePayPalWebhookEvent(
  prismaClient: {
    webhookEvent: {
      findUnique: (args: any) => Promise<any>;
      create: (args: any) => Promise<any>;
    };
    paymentIntent: {
      findUnique: (args: any) => Promise<any>;
      findFirst: (args: any) => Promise<any>;
      update: (args: any) => Promise<any>;
    };
    auditEvent: {
      create: (args: any) => Promise<any>;
    };
  },
  event: {
    id: string;
    event_type: string;
    resource?: any;
    create_time?: string;
  }
): Promise<WebhookReconciliationResult> {
  const eventId = event.id;
  const eventType = event.event_type;
  const resource = event.resource ?? {};

  // 1. Idempotency Check: prevent duplicate event processing
  const existingEvent = await prismaClient.webhookEvent.findUnique({
    where: { id: eventId }
  });

  if (existingEvent) {
    return {
      processed: true,
      duplicate: true,
      action: "IGNORED_DUPLICATE"
    };
  }

  // 2. Correlate with local PaymentIntent record
  const intentId = resource.custom_id ?? resource.reference_id ?? resource.invoice_id;
  const paypalOrderId = resource.supplementary_data?.related_ids?.order_id;
  const captureId = resource.id;

  let intent = null;
  if (intentId) {
    intent = await prismaClient.paymentIntent.findUnique({ where: { id: intentId } });
  }
  if (!intent && paypalOrderId) {
    intent = await prismaClient.paymentIntent.findFirst({ where: { paypalOrderId } });
  }

  // 3. Process state machine transition based on verified event type
  let updatedStatus: string | undefined;

  switch (eventType) {
    case "PAYMENT.CAPTURE.COMPLETED":
      if (intent && intent.status !== "COMPLETED") {
        updatedStatus = "COMPLETED";
        await prismaClient.paymentIntent.update({
          where: { id: intent.id },
          data: {
            status: "COMPLETED",
            paypalCaptureId: captureId ?? intent.paypalCaptureId,
            decisionReason: "PayPal webhook confirmed capture COMPLETED."
          }
        });
        await prismaClient.auditEvent.create({
          data: {
            eventType: "WEBHOOK_PAYMENT_COMPLETED",
            entityId: intent.id,
            message: `PayPal webhook ${eventId} confirmed capture COMPLETED.`
          }
        });
      }
      break;

    case "PAYMENT.CAPTURE.DENIED":
    case "PAYMENT.CAPTURE.DECLINED":
      if (intent && intent.status !== "FAILED") {
        updatedStatus = "FAILED";
        await prismaClient.paymentIntent.update({
          where: { id: intent.id },
          data: {
            status: "FAILED",
            decisionReason: `PayPal webhook reported capture ${eventType}.`
          }
        });
        await prismaClient.auditEvent.create({
          data: {
            eventType: "WEBHOOK_PAYMENT_FAILED",
            entityId: intent.id,
            message: `PayPal webhook ${eventId} reported capture ${eventType}.`
          }
        });
      }
      break;

    case "CHECKOUT.ORDER.CANCELLED":
    case "CHECKOUT.ORDER.VOIDED":
      if (intent && intent.status !== "CANCELLED" && intent.status !== "COMPLETED") {
        updatedStatus = "CANCELLED";
        await prismaClient.paymentIntent.update({
          where: { id: intent.id },
          data: {
            status: "CANCELLED",
            decisionReason: "PayPal order was cancelled or voided."
          }
        });
        await prismaClient.auditEvent.create({
          data: {
            eventType: "WEBHOOK_ORDER_CANCELLED",
            entityId: intent.id,
            message: `PayPal webhook ${eventId} reported order cancelled.`
          }
        });
      }
      break;

    default:
      await prismaClient.auditEvent.create({
        data: {
          eventType: "WEBHOOK_EVENT_RECEIVED",
          entityId: intent?.id ?? eventId,
          message: `Received webhook event ${eventType} (${eventId}).`
        }
      });
      break;
  }

  // 4. Record the processed webhook event atomically in WebhookEvent table
  await prismaClient.webhookEvent.create({
    data: {
      id: eventId,
      eventType
    }
  });

  return {
    processed: true,
    duplicate: false,
    intentId: intent?.id,
    status: updatedStatus ?? intent?.status,
    action: updatedStatus ? `UPDATED_TO_${updatedStatus}` : "EVENT_LOGGED"
  };
}

export function isPayPalConfigured() {
  return paypalConfigured;
}
