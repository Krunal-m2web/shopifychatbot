-- =========================
-- Dashboard Metrics Table
-- Stores daily aggregated analytics data
-- =========================
CREATE TABLE IF NOT EXISTS dashboard_metrics (
  id SERIAL PRIMARY KEY,
  merchant_id INTEGER REFERENCES merchants(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  total_conversations INTEGER DEFAULT 0,
  resolved_conversations INTEGER DEFAULT 0,
  avg_response_time_ms INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  avg_messages_per_conversation DECIMAL(5, 2) DEFAULT 0,
  top_products JSONB DEFAULT '[]'::jsonb,
  top_intents JSONB DEFAULT '[]'::jsonb,
  peak_hours JSONB DEFAULT '[]'::jsonb,
  sentiment_scores JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(merchant_id, metric_date)
);

-- =========================
-- Conversation Analytics Table
-- Stores per-conversation metadata for detailed analysis
-- =========================
CREATE TABLE IF NOT EXISTS conversation_analytics (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) UNIQUE NOT NULL REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
  merchant_id INTEGER REFERENCES merchants(id) ON DELETE CASCADE,
  message_count INTEGER DEFAULT 0,
  duration_seconds INTEGER,
  is_resolved BOOLEAN DEFAULT false,
  resolution_type VARCHAR(50), -- 'auto', 'handoff', 'abandoned'
  sentiment_score DECIMAL(3, 2), -- -1.00 to 1.00
  intent_primary VARCHAR(100),
  products_mentioned TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- Merchant Settings Table
-- Key-value store for dashboard preferences
-- =========================
CREATE TABLE IF NOT EXISTS merchant_settings (
  id SERIAL PRIMARY KEY,
  merchant_id INTEGER UNIQUE REFERENCES merchants(id) ON DELETE CASCADE,
  chat_widget_config JSONB DEFAULT '{
    "primaryColor": "#5C6AC4",
    "position": "bottom-right",
    "welcomeMessage": "Hi! How can we help you today?"
  }'::jsonb,
  ai_config JSONB DEFAULT '{
    "model": "claude-3-5-sonnet",
    "temperature": 0.7,
    "maxTokens": 500
  }'::jsonb,
  rag_settings JSONB DEFAULT '{
    "embeddingModel": "text-embedding-3-small",
    "chunkSize": 500
  }'::jsonb,
  notification_settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- Indexes for Performance
-- =========================
CREATE INDEX IF NOT EXISTS idx_dashboard_metrics_merchant_date ON dashboard_metrics(merchant_id, metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_analytics_merchant ON conversation_analytics(merchant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_analytics_resolved ON conversation_analytics(merchant_id, is_resolved);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_merchant ON chat_sessions(merchant_id, started_at DESC);

-- =========================
-- Functions for Auto-Update Timestamps
-- =========================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for auto-updating timestamps
DROP TRIGGER IF EXISTS update_dashboard_metrics_updated_at ON dashboard_metrics;
CREATE TRIGGER update_dashboard_metrics_updated_at
  BEFORE UPDATE ON dashboard_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_conversation_analytics_updated_at ON conversation_analytics;
CREATE TRIGGER update_conversation_analytics_updated_at
  BEFORE UPDATE ON conversation_analytics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_merchant_settings_updated_at ON merchant_settings;
CREATE TRIGGER update_merchant_settings_updated_at
  BEFORE UPDATE ON merchant_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================
-- Initial Merchant Settings for Existing Merchants
-- =========================
INSERT INTO merchant_settings (merchant_id)
SELECT id FROM merchants
WHERE id NOT IN (SELECT merchant_id FROM merchant_settings WHERE merchant_id IS NOT NULL)
ON CONFLICT (merchant_id) DO NOTHING;
