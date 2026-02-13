/**
 * Analytics Aggregator Service
 * Calculates and caches daily analytics metrics
 */

import { query } from "../utils/pg.server";

export interface DailyMetrics {
  merchantId: number;
  metricDate: string;
  totalConversations: number;
  resolvedConversations: number;
  avgResponseTimeMs: number;
  totalMessages: number;
  avgMessagesPerConversation: number;
  topProducts: Array<{ product: string; count: number }>;
  topIntents: Array<{ intent: string; count: number }>;
  peakHours: Array<{ hour: number; count: number }>;
  sentimentScores: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

/**
 * Aggregate metrics for a specific date
 */
export async function aggregateDailyMetrics(
  merchantId: number,
  date: Date = new Date()
): Promise<DailyMetrics> {
  const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD

  try {
    // Total conversations for the day
    const conversationsResult = await query(
      `SELECT COUNT(*) as count
       FROM chat_sessions
       WHERE merchant_id = $1
       AND DATE(started_at) = $2`,
      [merchantId, dateStr]
    );
    const totalConversations = parseInt(conversationsResult.rows[0]?.count || "0");

    // Resolved conversations
    const resolvedResult = await query(
      `SELECT COUNT(*) as count
       FROM conversation_analytics ca
       JOIN chat_sessions cs ON ca.session_id = cs.session_id
       WHERE ca.merchant_id = $1
       AND ca.is_resolved = true
       AND DATE(cs.started_at) = $2`,
      [merchantId, dateStr]
    );
    const resolvedConversations = parseInt(resolvedResult.rows[0]?.count || "0");

    // Average response time (time between user message and assistant response)
    const avgResponseResult = await query(
      `SELECT AVG(EXTRACT(EPOCH FROM (
         next_msg.created_at - curr_msg.created_at
       )) * 1000) as avg_ms
       FROM chat_messages curr_msg
       JOIN chat_messages next_msg ON next_msg.id = (
         SELECT MIN(id)
         FROM chat_messages
         WHERE session_id = curr_msg.session_id
         AND id > curr_msg.id
         AND role = 'assistant'
       )
       JOIN chat_sessions cs ON curr_msg.session_id = cs.session_id
       WHERE curr_msg.role = 'user'
       AND cs.merchant_id = $1
       AND DATE(curr_msg.created_at) = $2`,
      [merchantId, dateStr]
    );
    const avgResponseTimeMs = Math.round(parseFloat(avgResponseResult.rows[0]?.avg_ms || "0"));

    // Total messages
    const messagesResult = await query(
      `SELECT COUNT(*) as count
       FROM chat_messages cm
       JOIN chat_sessions cs ON cm.session_id = cs.session_id
       WHERE cs.merchant_id = $1
       AND DATE(cm.created_at) = $2`,
      [merchantId, dateStr]
    );
    const totalMessages = parseInt(messagesResult.rows[0]?.count || "0");

    // Average messages per conversation
    const avgMessagesPerConversation =
      totalConversations > 0
        ? parseFloat((totalMessages / totalConversations).toFixed(2))
        : 0;

    // Top products mentioned
    const topProductsResult = await query(
      `SELECT UNNEST(products_mentioned) as product, COUNT(*) as count
       FROM conversation_analytics ca
       JOIN chat_sessions cs ON ca.session_id = cs.session_id
       WHERE ca.merchant_id = $1
       AND DATE(cs.started_at) = $2
       AND products_mentioned IS NOT NULL
       GROUP BY product
       ORDER BY count DESC
       LIMIT 10`,
      [merchantId, dateStr]
    );
    const topProducts = topProductsResult.rows.map((row) => ({
      product: row.product,
      count: parseInt(row.count),
    }));

    // Top intents
    const topIntentsResult = await query(
      `SELECT intent_primary as intent, COUNT(*) as count
       FROM conversation_analytics ca
       JOIN chat_sessions cs ON ca.session_id = cs.session_id
       WHERE ca.merchant_id = $1
       AND DATE(cs.started_at) = $2
       AND intent_primary IS NOT NULL
       GROUP BY intent
       ORDER BY count DESC
       LIMIT 10`,
      [merchantId, dateStr]
    );
    const topIntents = topIntentsResult.rows.map((row) => ({
      intent: row.intent,
      count: parseInt(row.count),
    }));

    // Peak hours (distribution of conversations by hour)
    const peakHoursResult = await query(
      `SELECT EXTRACT(HOUR FROM started_at) as hour, COUNT(*) as count
       FROM chat_sessions
       WHERE merchant_id = $1
       AND DATE(started_at) = $2
       GROUP BY hour
       ORDER BY count DESC`,
      [merchantId, dateStr]
    );
    const peakHours = peakHoursResult.rows.map((row) => ({
      hour: parseInt(row.hour),
      count: parseInt(row.count),
    }));

    // Sentiment score distribution
    const sentimentResult = await query(
      `SELECT
         COUNT(CASE WHEN sentiment_score > 0.3 THEN 1 END) as positive,
         COUNT(CASE WHEN sentiment_score BETWEEN -0.3 AND 0.3 THEN 1 END) as neutral,
         COUNT(CASE WHEN sentiment_score < -0.3 THEN 1 END) as negative
       FROM conversation_analytics ca
       JOIN chat_sessions cs ON ca.session_id = cs.session_id
       WHERE ca.merchant_id = $1
       AND DATE(cs.started_at) = $2
       AND sentiment_score IS NOT NULL`,
      [merchantId, dateStr]
    );
    const sentimentScores = {
      positive: parseInt(sentimentResult.rows[0]?.positive || "0"),
      neutral: parseInt(sentimentResult.rows[0]?.neutral || "0"),
      negative: parseInt(sentimentResult.rows[0]?.negative || "0"),
    };

    return {
      merchantId,
      metricDate: dateStr,
      totalConversations,
      resolvedConversations,
      avgResponseTimeMs,
      totalMessages,
      avgMessagesPerConversation,
      topProducts,
      topIntents,
      peakHours,
      sentimentScores,
    };
  } catch (error) {
    console.error("Error aggregating daily metrics:", error);
    throw error;
  }
}

/**
 * Store aggregated metrics in the database
 */
export async function storeDailyMetrics(metrics: DailyMetrics): Promise<void> {
  try {
    await query(
      `INSERT INTO dashboard_metrics (
        merchant_id, metric_date, total_conversations, resolved_conversations,
        avg_response_time_ms, total_messages, avg_messages_per_conversation,
        top_products, top_intents, peak_hours, sentiment_scores
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (merchant_id, metric_date)
      DO UPDATE SET
        total_conversations = EXCLUDED.total_conversations,
        resolved_conversations = EXCLUDED.resolved_conversations,
        avg_response_time_ms = EXCLUDED.avg_response_time_ms,
        total_messages = EXCLUDED.total_messages,
        avg_messages_per_conversation = EXCLUDED.avg_messages_per_conversation,
        top_products = EXCLUDED.top_products,
        top_intents = EXCLUDED.top_intents,
        peak_hours = EXCLUDED.peak_hours,
        sentiment_scores = EXCLUDED.sentiment_scores,
        updated_at = CURRENT_TIMESTAMP`,
      [
        metrics.merchantId,
        metrics.metricDate,
        metrics.totalConversations,
        metrics.resolvedConversations,
        metrics.avgResponseTimeMs,
        metrics.totalMessages,
        metrics.avgMessagesPerConversation,
        JSON.stringify(metrics.topProducts),
        JSON.stringify(metrics.topIntents),
        JSON.stringify(metrics.peakHours),
        JSON.stringify(metrics.sentimentScores),
      ]
    );

    console.log(`✅ Stored metrics for ${metrics.metricDate}`);
  } catch (error) {
    console.error("Error storing daily metrics:", error);
    throw error;
  }
}

/**
 * Run aggregation for all merchants for a specific date
 */
export async function aggregateAllMerchants(date: Date = new Date()): Promise<void> {
  try {
    const merchantsResult = await query("SELECT id FROM merchants");

    for (const merchant of merchantsResult.rows) {
      console.log(`📊 Aggregating metrics for merchant ${merchant.id}...`);
      const metrics = await aggregateDailyMetrics(merchant.id, date);
      await storeDailyMetrics(metrics);
    }

    console.log("✅ All merchant metrics aggregated");
  } catch (error) {
    console.error("Error aggregating all merchants:", error);
    throw error;
  }
}

/**
 * Get metrics for a date range
 */
export async function getMetricsForRange(
  merchantId: number,
  startDate: string,
  endDate: string
): Promise<DailyMetrics[]> {
  try {
    const result = await query(
      `SELECT * FROM dashboard_metrics
       WHERE merchant_id = $1
       AND metric_date BETWEEN $2 AND $3
       ORDER BY metric_date ASC`,
      [merchantId, startDate, endDate]
    );

    return result.rows.map((row) => ({
      merchantId: row.merchant_id,
      metricDate: row.metric_date,
      totalConversations: row.total_conversations,
      resolvedConversations: row.resolved_conversations,
      avgResponseTimeMs: row.avg_response_time_ms,
      totalMessages: row.total_messages,
      avgMessagesPerConversation: parseFloat(row.avg_messages_per_conversation),
      topProducts: row.top_products,
      topIntents: row.top_intents,
      peakHours: row.peak_hours,
      sentimentScores: row.sentiment_scores,
    }));
  } catch (error) {
    console.error("Error getting metrics for range:", error);
    throw error;
  }
}
