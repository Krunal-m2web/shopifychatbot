import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { useLoaderData, useFetcher } from 'react-router';
import { useState } from 'react';
import { authenticate } from '~/shopify.server';
import prisma from '~/db.server';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const merchant = await prisma.merchant.findUnique({
    where: { shopDomain: session.shop },
    select: { id: true, widgetConfig: true, shopDomain: true },
  });

  if (!merchant) {
    throw new Response('Merchant not found', { status: 404 });
  }

  const config = merchant.widgetConfig as any;

  return {
    merchantId: merchant.id,
    shopDomain: merchant.shopDomain,
    widgetConfig: {
      primaryColor: config.primaryColor || '#2563EB',
      position: config.position || 'bottom-right',
      welcomeMessage: config.welcomeMessage || 'Hi! How can I help you today?',
      botName: config.botName || 'Support Assistant',
    },
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const formData = await request.formData();
  const primaryColor = formData.get('primaryColor') as string;
  const position = formData.get('position') as string;
  const welcomeMessage = formData.get('welcomeMessage') as string;
  const botName = formData.get('botName') as string;

  await prisma.merchant.update({
    where: { shopDomain: session.shop },
    data: {
      widgetConfig: {
        primaryColor,
        position,
        welcomeMessage,
        botName,
      },
    },
  });

  return { success: true };
};

export default function SettingsPage() {
  const { merchantId, shopDomain, widgetConfig } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  const [config, setConfig] = useState(widgetConfig);

  const handleSave = () => {
    const formData = new FormData();
    formData.append('primaryColor', config.primaryColor);
    formData.append('position', config.position);
    formData.append('welcomeMessage', config.welcomeMessage);
    formData.append('botName', config.botName);

    fetcher.submit(formData, { method: 'POST' });
  };

  const embedCode = `<script src="${process.env.APP_URL || 'https://your-app.vercel.app'}/widget/widget.iife.js" data-merchant-id="${merchantId}" defer></script>`;

  return (
    <s-page heading="Settings">
      {/* Widget Customization */}
      <s-section heading="Widget Customization">
        <s-stack direction="block" gap="large">
          <s-stack direction="block" gap="tight">
            <s-text variant="headingSm">Bot Name</s-text>
            <input
              type="text"
              value={config.botName}
              onChange={(e) => setConfig({ ...config, botName: e.target.value })}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </s-stack>

          <s-stack direction="block" gap="tight">
            <s-text variant="headingSm">Welcome Message</s-text>
            <textarea
              value={config.welcomeMessage}
              onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })}
              rows={3}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', resize: 'vertical' }}
            />
          </s-stack>

          <s-stack direction="block" gap="tight">
            <s-text variant="headingSm">Primary Color</s-text>
            <input
              type="color"
              value={config.primaryColor}
              onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
              style={{ width: '100px', height: '40px' }}
            />
          </s-stack>

          <s-stack direction="block" gap="tight">
            <s-text variant="headingSm">Widget Position</s-text>
            <select
              value={config.position}
              onChange={(e) => setConfig({ ...config, position: e.target.value })}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="bottom-right">Bottom Right</option>
              <option value="bottom-left">Bottom Left</option>
            </select>
          </s-stack>

          <s-button variant="primary" onClick={handleSave} loading={fetcher.state !== 'idle'}>
            Save Changes
          </s-button>

          {fetcher.data?.success && (
            <s-banner tone="success">Settings saved successfully!</s-banner>
          )}
        </s-stack>
      </s-section>

      {/* Widget Installation */}
      <s-section heading="Widget Installation">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            Add this code to your theme's layout file (usually theme.liquid) before the closing &lt;/body&gt; tag:
          </s-paragraph>

          <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
            <pre style={{ margin: 0, overflow: 'auto' }}>
              <code>{embedCode}</code>
            </pre>
          </s-box>

          <s-button
            variant="secondary"
            onClick={() => {
              navigator.clipboard.writeText(embedCode);
            }}
          >
            Copy Code
          </s-button>
        </s-stack>
      </s-section>

      {/* Store Info */}
      <s-section slot="aside" heading="Store Information">
        <s-stack direction="block" gap="base">
          <s-text tone="subdued">Shop Domain: {shopDomain}</s-text>
          <s-text tone="subdued" variant="bodySm">Merchant ID: {merchantId}</s-text>
        </s-stack>
      </s-section>
    </s-page>
  );
}
