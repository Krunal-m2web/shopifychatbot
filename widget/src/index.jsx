import { h, render } from "preact";
import { Widget } from "./components/Widget";
import "./styles.css";

// Initialize the widget
async function initShopifyAIChat(config = {}) {
  const {
    apiUrl = typeof window !== "undefined" ? window.location.origin : "",
    containerId = "shopify-ai-chat-widget",
    merchantId = "1", // Default to 1 for testing
  } = config;
  const normalizedApiUrl = (apiUrl || "")
    .replace(/\/+$/, "")
    .replace(/\/api\/chat\/?$/, "");

  // Fetch settings from storefront API
  let settings = null;
  try {
    const response = await fetch(
      `${normalizedApiUrl}/api/shop/settings?merchantId=${merchantId}`
    );
    if (response.ok) {
      const data = await response.json();
      settings = data.settings;
    }
  } catch (error) {
    console.error("Failed to fetch widget settings:", error);
  }

  // Apply branding settings if available
  if (settings) {
    const root = document.documentElement;
    if (settings.primaryColor) {
      root.style.setProperty("--chat-primary-color", settings.primaryColor);
      root.style.setProperty("--chat-user-msg-color", settings.primaryColor);
    }
    if (settings.secondaryColor) {
      root.style.setProperty("--chat-secondary-color", settings.secondaryColor);
    }
    if (settings.borderRadius !== undefined) {
      root.style.setProperty("--chat-border-radius", `${settings.borderRadius}px`);
    }

    if (settings.position) {
      const p = settings.position;
      if (p === "bottom-right") {
        root.style.setProperty("--chat-position-bottom", "20px");
        root.style.setProperty("--chat-position-right", "20px");
        root.style.setProperty("--chat-position-top", "auto");
        root.style.setProperty("--chat-position-left", "auto");
      } else if (p === "bottom-left") {
        root.style.setProperty("--chat-position-bottom", "20px");
        root.style.setProperty("--chat-position-right", "auto");
        root.style.setProperty("--chat-position-top", "auto");
        root.style.setProperty("--chat-position-left", "20px");
      } else if (p === "top-right") {
        root.style.setProperty("--chat-position-bottom", "auto");
        root.style.setProperty("--chat-position-right", "20px");
        root.style.setProperty("--chat-position-top", "20px");
        root.style.setProperty("--chat-position-left", "auto");
      } else if (p === "top-left") {
        root.style.setProperty("--chat-position-bottom", "auto");
        root.style.setProperty("--chat-position-right", "auto");
        root.style.setProperty("--chat-position-top", "20px");
        root.style.setProperty("--chat-position-left", "20px");
      }
    }
    
    // Inject Custom CSS
    if (settings.customCss) {
      const styleTag = document.createElement("style");
      styleTag.id = "shopify-ai-chat-custom-css";
      styleTag.innerHTML = settings.customCss;
      document.head.appendChild(styleTag);
    }
  }

  // Create container if it doesn't exist
  let container = document.getElementById(containerId);

  if (!container) {
    container = document.createElement("div");
    container.id = containerId;
    container.className = "chat-widget-container";
    document.body.appendChild(container);
  } else {
    container.className = "chat-widget-container";
  }

  // Render widget
  render(h(Widget, { apiUrl: normalizedApiUrl, settings, merchantId }), container);
}

// Auto-initialize if window.ShopifyAIChatConfig exists
if (typeof window !== "undefined") {
  if (window.ShopifyAIChatConfig) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        initShopifyAIChat(window.ShopifyAIChatConfig);
      });
    } else {
      initShopifyAIChat(window.ShopifyAIChatConfig);
    }
  }

  // Expose init function globally
  window.initShopifyAIChat = initShopifyAIChat;
}

export default initShopifyAIChat;
