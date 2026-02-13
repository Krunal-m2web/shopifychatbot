import { render } from 'preact';
import Widget from './Widget';

// Self-initializing widget
(function() {
  // Find the script tag that loaded this widget
  const scripts = document.getElementsByTagName('script');
  const currentScript = scripts[scripts.length - 1];
  const merchantId = currentScript.getAttribute('data-merchant-id');
  const appUrl = currentScript.getAttribute('data-app-url') || '';

  if (!merchantId) {
    console.error('Shopify Chat Widget: data-merchant-id attribute is required');
    return;
  }

  // Create widget container with shadow DOM for style isolation
  const container = document.createElement('div');
  container.id = 'shopify-chat-widget-root';
  document.body.appendChild(container);

  // Create shadow root for style isolation
  const shadowRoot = container.attachShadow({ mode: 'open' });
  const widgetMount = document.createElement('div');
  shadowRoot.appendChild(widgetMount);

  // Render the widget
  render(<Widget merchantId={merchantId} appUrl={appUrl} />, widgetMount);
})();
