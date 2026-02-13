import { mockOrders, mockProducts, mockShop } from "../data/mock-shopify";

// This simulates Shopify API calls
export class MockShopifyService {
  async getProducts(limit = 250) {
    return { products: mockProducts };
  }

  async getProduct(id: string) {
    const product = mockProducts.find((p) => p.id === id);
    return { product };
  }

  async getOrder(orderNumber: number) {
    const order = mockOrders.find((o) => o.order_number === orderNumber);
    return { order };
  }

  async getShop() {
    return { shop: mockShop };
  }

  // Simulate webhook events
  async simulateWebhook(topic: string, data: any) {
    console.log(`[MOCK WEBHOOK] ${topic}`, data);
    return { success: true };
  }
}

export const shopifyService = new MockShopifyService();
