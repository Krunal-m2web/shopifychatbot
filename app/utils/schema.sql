-- =========================
-- Merchants table
-- =========================
CREATE TABLE IF NOT EXISTS merchants (
  id SERIAL PRIMARY KEY,
  shop_domain VARCHAR(255) UNIQUE NOT NULL,
  shop_name VARCHAR(255),
  installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  settings JSONB DEFAULT '{}'::jsonb
);

-- =========================
-- Shopify Sessions (for @shopify/shopify-app-session-storage-postgresql)
-- =========================
CREATE TABLE IF NOT EXISTS shopify_sessions (
  id VARCHAR(255) PRIMARY KEY,
  shop VARCHAR(255) NOT NULL,
  state VARCHAR(255) NOT NULL,
  isOnline BOOLEAN NOT NULL,
  scope VARCHAR(255),
  expires INTEGER,
  onlineAccessInfo VARCHAR(255),
  accessToken VARCHAR(255)
);

-- =========================
-- Chat sessions
-- =========================
CREATE TABLE IF NOT EXISTS chat_sessions (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) UNIQUE NOT NULL,
  merchant_id INTEGER REFERENCES merchants(id),
  customer_email VARCHAR(255),
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- =========================
-- Chat messages
-- =========================
CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) REFERENCES chat_sessions(session_id),
  role VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- Products (synced from mock Shopify)
-- =========================
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  merchant_id INTEGER REFERENCES merchants(id),
  shopify_id VARCHAR(255),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2),
  collections TEXT[],
  tags TEXT[],
  available BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- Orders (for testing order lookup)
-- =========================
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  merchant_id INTEGER REFERENCES merchants(id),
  shopify_id VARCHAR(255),
  order_number INTEGER,
  customer_email VARCHAR(255),
  status VARCHAR(100),
  total DECIMAL(10, 2),
  billing_zip VARCHAR(20),
  tracking_number VARCHAR(255),
  items JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Webhook logs for idempotency and debugging
CREATE TABLE IF NOT EXISTS webhook_logs (
  id SERIAL PRIMARY KEY,
  webhook_id VARCHAR(255) UNIQUE NOT NULL,
  topic VARCHAR(100) NOT NULL,
  shop_domain VARCHAR(255) NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP,
  error TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_id ON webhook_logs (webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_topic ON webhook_logs (topic);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_shop ON webhook_logs (shop_domain);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_processed ON webhook_logs (processed, created_at);


-- =========================
-- Indexes
-- =========================
CREATE INDEX IF NOT EXISTS idx_chat_sessions_session_id ON chat_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_products_merchant ON products(merchant_id);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number, merchant_id);
