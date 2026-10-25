# PayPal Sandbox setup

1. Sign in at https://developer.paypal.com/.
2. Create a Sandbox REST application.
3. Copy its Sandbox Client ID and Secret into `.env`.
4. Set `PAYPAL_ENV=sandbox`.
5. Configure a webhook in the developer dashboard and set `PAYPAL_WEBHOOK_ID`.

Current limitation: the starter contains order and capture helpers but does not yet expose a PayPal webhook receiver or call PayPal's webhook signature verification endpoint. Do not treat webhook verification as complete until that endpoint is implemented and tested. Validate order/capture response semantics against current PayPal documentation before a live demonstration.
