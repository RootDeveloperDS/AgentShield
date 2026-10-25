import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 4000),
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3000",
  paypalEnv: process.env.PAYPAL_ENV ?? "sandbox",
  paypalClientId: process.env.PAYPAL_CLIENT_ID ?? "",
  paypalClientSecret: process.env.PAYPAL_CLIENT_SECRET ?? "",
  paypalWebhookId: process.env.PAYPAL_WEBHOOK_ID ?? "",
};

export const paypalConfigured = Boolean(config.paypalClientId && config.paypalClientSecret);
export const paypalBaseUrl = config.paypalEnv === "live"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";
