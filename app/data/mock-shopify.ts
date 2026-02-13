// This simulates Shopify API responses

export const mockProducts = [
  {
    id: "gid://shopify/Product/1",
    title: "Premium Wireless Headphones",
    body_html:
      "<p>High-quality wireless headphones with active noise cancellation</p>",
    vendor: "AudioTech",
    product_type: "Electronics",
    tags: ["wireless", "audio", "premium"],
    variants: [
      {
        id: "gid://shopify/ProductVariant/1",
        price: "299.99",
        available: true,
        sku: "WH-001",
      },
    ],
    images: [
      {
        src: "https://example.com/headphones.jpg",
      },
    ],
    collections: ["Electronics", "Featured"],
  },
  {
    id: "gid://shopify/Product/2",
    title: "Organic Cotton T-Shirt",
    body_html: "<p>Soft, breathable organic cotton t-shirt</p>",
    vendor: "EcoWear",
    product_type: "Clothing",
    tags: ["organic", "cotton", "sustainable"],
    variants: [
      {
        id: "gid://shopify/ProductVariant/2",
        price: "29.99",
        available: true,
        sku: "TS-001",
      },
    ],
    images: [
      {
        src: "https://example.com/tshirt.jpg",
      },
    ],
    collections: ["Clothing", "Eco-Friendly"],
  },
];

export const mockOrders = [
  {
    id: "gid://shopify/Order/1",
    order_number: 1001,
    name: "#1001",
    email: "john.doe@example.com",
    created_at: "2026-01-15T10:30:00Z",
    financial_status: "paid",
    fulfillment_status: "fulfilled",
    total_price: "329.98",
    customer: {
      first_name: "John",
      last_name: "Doe",
      email: "john.doe@example.com",
    },
    billing_address: {
      zip: "12345",
      city: "San Francisco",
      province: "CA",
    },
    line_items: [
      {
        title: "Premium Wireless Headphones",
        quantity: 1,
        price: "299.99",
      },
      {
        title: "Organic Cotton T-Shirt",
        quantity: 1,
        price: "29.99",
      },
    ],
    fulfillments: [
      {
        tracking_number: "1Z999AA10123456784",
        tracking_company: "UPS",
        tracking_url:
          "https://www.ups.com/track?tracknum=1Z999AA10123456784",
        status: "in_transit",
      },
    ],
  },
  {
    id: "gid://shopify/Order/2",
    order_number: 1002,
    name: "#1002",
    email: "jane.smith@example.com",
    created_at: "2026-02-01T14:20:00Z",
    financial_status: "paid",
    fulfillment_status: "unfulfilled",
    total_price: "59.99",
    customer: {
      first_name: "Jane",
      last_name: "Smith",
      email: "jane.smith@example.com",
    },
    billing_address: {
      zip: "90210",
      city: "Los Angeles",
      province: "CA",
    },
    line_items: [
      {
        title: "Yoga Mat Pro",
        quantity: 1,
        price: "59.99",
      },
    ],
    fulfillments: [],
  },
  {
    id: "gid://shopify/Order/3",
    order_number: 1003,
    name: "#1003",
    email: "bob.wilson@example.com",
    created_at: "2026-02-08T09:45:00Z",
    financial_status: "paid",
    fulfillment_status: "partial",
    total_price: "124.97",
    customer: {
      first_name: "Bob",
      last_name: "Wilson",
      email: "bob.wilson@example.com",
    },
    billing_address: {
      zip: "10001",
      city: "New York",
      province: "NY",
    },
    line_items: [
      {
        title: "Smart Watch Series 5",
        quantity: 1,
        price: "399.99",
      },
      {
        title: "Stainless Steel Water Bottle",
        quantity: 2,
        price: "34.99",
      },
    ],
    fulfillments: [
      {
        tracking_number: "9400111899562814062796",
        tracking_company: "USPS",
        tracking_url:
          "https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111899562814062796",
        status: "delivered",
      },
    ],
  },
];


export const mockShop = {
  name: "My Test Store",
  email: "store@example.com",
  domain: "test-store.myshopify.com",
  currency: "USD",
};
