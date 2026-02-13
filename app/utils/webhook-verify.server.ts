import crypto from "crypto";

export function verifyWebhookHMAC(
  body: string,
  hmacHeader: string | null,
  secret: string
): boolean {
  if (!hmacHeader) {
    console.error("Missing HMAC header");
    return false;
  }

  try {
    const hash = crypto
      .createHmac("sha256", secret)
      .update(body, "utf8")
      .digest("base64");

    // Use timingSafeEqual to prevent timing attacks
    const hmacBuffer = Buffer.from(hmacHeader);
    const hashBuffer = Buffer.from(hash);

    if (hmacBuffer.length !== hashBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(hmacBuffer, hashBuffer);
  } catch (error) {
    console.error("HMAC verification error:", error);
    return false;
  }
}

export function extractWebhookMetadata(headers: Headers) {
  return {
    topic: headers.get("x-shopify-topic"),
    shopDomain: headers.get("x-shopify-shop-domain"),
    webhookId: headers.get("x-shopify-webhook-id"),
    apiVersion: headers.get("x-shopify-api-version"),
  };
}
