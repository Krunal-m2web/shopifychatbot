const CLIENT_ID = "3d692e45979d5ac97cdfad4f569e0d76";
const BLOCK_HANDLE = "chat-embed";
const ACTIVATION_APP_ID = `${CLIENT_ID}/${BLOCK_HANDLE}`;

export interface WidgetStatus {
  isActive: boolean;
  activationUrl: string;
}

export async function checkWidgetActivationStatus(admin: any): Promise<WidgetStatus> {
  const response = await admin.graphql(`
    {
      themes(first: 1, roles: MAIN) {
        nodes {
          id
          files(filenames: ["config/settings_data.json"], first: 1) {
            nodes {
              body {
                ... on OnlineStoreThemeFileBodyText {
                  content
                }
              }
            }
          }
        }
      }
      shop {
        myshopifyDomain
      }
    }
  `);

  const data = await response.json();
  const shopDomain = data.data?.shop?.myshopifyDomain || "";
  const activationUrl = `https://${shopDomain}/admin/themes/current/editor?context=apps&activateAppId=${ACTIVATION_APP_ID}`;

  const settingsContent = data.data?.themes?.nodes?.[0]?.files?.nodes?.[0]?.body?.content;
  if (!settingsContent) {
    return { isActive: false, activationUrl };
  }

  try {
    const settingsData = JSON.parse(settingsContent);
    const blocks = settingsData?.current?.blocks || {};

    for (const block of Object.values(blocks)) {
      const b = block as any;
      // Shopify stores block types as: shopify://apps/{app_name}/blocks/chat-embed/{uid}
      if (b.type?.includes(`/blocks/${BLOCK_HANDLE}/`) && b.disabled !== true) {
        return { isActive: true, activationUrl };
      }
    }
  } catch {
    // Failed to parse theme settings
  }

  return { isActive: false, activationUrl };
}
