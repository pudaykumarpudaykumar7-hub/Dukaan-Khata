# Dukaan Khata Payment API

This backend keeps Razorpay secrets off GitHub Pages.

Set RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET in your hosting provider. Never commit real secrets.

Endpoints: GET /health, POST /api/razorpay/order, POST /api/razorpay/verify, POST /api/razorpay/webhook.

In Dukaan Khata, open More -> Payment Gateway and enter the public Razorpay Key ID plus the HTTPS backend URL.

Paytm is prepared as a separate provider slot; its merchant key must remain server-side.