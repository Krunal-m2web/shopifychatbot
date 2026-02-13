import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("api/products", "routes/api.products.tsx"),
  route("api/chat", "routes/api.chat.tsx"),
  route("api/search", "routes/api.search.tsx"),
  route("api/orders", "routes/api.orders.tsx"),
  route("api/orders/test", "routes/api.orders.test.tsx"),
  route("api/orders/verify", "routes/api.orders.verify.tsx"),
  route("api/orders/lookup", "routes/api.orders.lookup.tsx"),
  route("api/dashboard/metrics", "routes/api.dashboard.metrics.tsx"),
  route("api/dashboard/conversations", "routes/api.dashboard.conversations.$sessionId.tsx", { id: "api.dashboard.conversations.list" }),
  route("api/dashboard/conversations/:sessionId", "routes/api.dashboard.conversations.$sessionId.tsx", { id: "api.dashboard.conversations.detail" }),
  route("api/dashboard/settings", "routes/api.dashboard.settings.tsx"),
  route("api/dashboard/sync", "routes/api.dashboard.sync.tsx"),
  route("api/dashboard/export", "routes/api.dashboard.export.tsx"),
  route("api/shop/settings", "routes/api.shop.settings.tsx"),
  route("api/similar", "routes/api.similar.tsx"),
  route("webhooks/*", "routes/webhooks.$.tsx"),
  route("auth/login", "routes/auth.login.tsx"),
  route("auth/*", "routes/auth.$.tsx"),
  
  // Dashboard routes with layout
  layout("routes/dashboard.tsx", [
    route("dashboard/analytics", "routes/dashboard.analytics.tsx"),
    route("dashboard/conversations", "routes/dashboard.conversations.tsx"),
    route("dashboard/conversations/:sessionId", "routes/dashboard.conversations.$sessionId.tsx"),
    route("dashboard/test-chat", "routes/dashboard.test-chat.tsx"),
    route("dashboard/settings", "routes/dashboard.settings.tsx"),
  ]),
] satisfies RouteConfig;
