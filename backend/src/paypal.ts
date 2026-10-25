import { config, paypalBaseUrl, paypalConfigured } from "./config.js";

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

export function isPayPalConfigured() {
  return paypalConfigured;
}
