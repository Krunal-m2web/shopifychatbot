export function getCorsHeaders(request: Request) {
  const origin = request.headers.get("origin");
  
  const allowed = [
    "https://admin.shopify.com",
    "https://my-test-shop-123465.myshopify.com",
  ];

  // if origin is allowed, return it, else fallback to store domain
  const allowOrigin = allowed.includes(origin ?? "")
    ? origin!
    : "https://my-test-shop-123465.myshopify.com";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Private-Network": "true"
  };
}
