import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";

import { authenticate } from "../shopify.server";
import prisma from "../db.server";

async function setAppUrlMetafield(admin: any, appUrl: string) {
  try {
    // First get the shop ID
    const shopResponse = await admin.graphql(`{ shop { id } }`);
    const shopData = await shopResponse.json();
    const shopId = shopData.data?.shop?.id;
    if (!shopId) return;

    // Ensure metafield definition exists with storefront access
    await admin.graphql(`
      mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
        metafieldDefinitionCreate(definition: $definition) {
          createdDefinition { id }
          userErrors { field message }
        }
      }
    `, {
      variables: {
        definition: {
          name: "App URL",
          namespace: "chatbot",
          key: "app_url",
          type: "single_line_text_field",
          ownerType: "SHOP",
          access: {
            storefront: "PUBLIC_READ",
          },
        },
      },
    }).catch(() => {}); // Ignore if definition already exists

    // Set the metafield with the app URL
    await admin.graphql(`
      mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields { id }
          userErrors { field message }
        }
      }
    `, {
      variables: {
        metafields: [{
          namespace: "chatbot",
          key: "app_url",
          ownerId: shopId,
          type: "single_line_text_field",
          value: appUrl,
        }],
      },
    });
  } catch (error) {
    console.error("Failed to set app_url metafield:", error);
  }
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);

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

  // Set the app URL metafield so the theme extension can auto-detect it
  const appUrl = process.env.APP_URL || process.env.SHOPIFY_APP_URL || '';
  if (appUrl) {
    setAppUrlMetafield(admin, appUrl);
  }

  // Fire-and-forget: queue initial sync for new installations (non-blocking)
  // This runs in the background so it won't block the page from loading
  (async () => {
    try {
      const hasDocuments = await prisma.$queryRaw<any[]>`
        SELECT EXISTS(SELECT 1 FROM documents WHERE merchant_id = ${merchant.id}::uuid) as has_docs
      `;

      const isNewInstall = !hasDocuments[0]?.has_docs;

      if (isNewInstall) {
        console.log(`🆕 New merchant installation detected: ${session.shop}. Queuing initial sync...`);
        const { enqueueSyncJob } = await import("../lib/queue");
        await Promise.race([
          enqueueSyncJob({
            merchantId: merchant.id,
            shopDomain: session.shop,
            syncType: 'full',
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Sync queue timeout')), 5000)),
        ]);
        console.log(`✅ Initial sync queued for ${session.shop}`);
      }
    } catch (error) {
      console.error('Failed to queue initial sync:', error);
    }
  })();

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
