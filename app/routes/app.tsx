import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";

import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { enqueueSyncJob } from "../lib/queue";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  // Upsert merchant record
  const merchant = await prisma.merchant.upsert({
    where: { shopDomain: session.shop },
    update: {
      accessToken: session.accessToken || "",
    },
    create: {
      shopDomain: session.shop,
      shopName: session.shop.replace(".myshopify.com", ""),
      accessToken: session.accessToken || "",
    },
  });

  // Check if this is a new installation (no documents synced yet)
  const hasDocuments = await prisma.$queryRaw<any[]>`
    SELECT EXISTS(SELECT 1 FROM documents WHERE merchant_id = ${merchant.id}::uuid) as has_docs
  `;

  const isNewInstall = !hasDocuments[0]?.has_docs;

  // Queue initial sync for new installations
  if (isNewInstall) {
    console.log(`🆕 New merchant installation detected: ${session.shop}. Queuing initial sync...`);
    try {
      await enqueueSyncJob({
        merchantId: merchant.id,
        shopDomain: session.shop,
        syncType: 'full',
      });
      console.log(`✅ Initial sync queued for ${session.shop}`);
    } catch (error) {
      console.error('Failed to queue initial sync:', error);
      // Don't fail the request if sync queueing fails
    }
  }

  // eslint-disable-next-line no-undef
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <AppProvider embedded apiKey={apiKey}>
      <s-app-nav>
        <s-link href="/app">Home</s-link>
        <s-link href="/app/conversations">Conversations</s-link>
        <s-link href="/app/analytics">Analytics</s-link>
        <s-link href="/app/settings">Settings</s-link>
      </s-app-nav>
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
