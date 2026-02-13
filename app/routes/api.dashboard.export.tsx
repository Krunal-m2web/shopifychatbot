/**
 * Dashboard Export API
 * Generates and streams CSV data for conversation history
 */

import type { Route } from "./+types/api.dashboard.export";
import { query } from "~/utils/db.server";

export async function loader({ request }: Route.LoaderArgs) {
  try {
    const url = new URL(request.url);
    const merchantId = parseInt(url.searchParams.get("merchantId") || "1");
    const dateFrom = url.searchParams.get("dateFrom");
    const dateTo = url.searchParams.get("dateTo");
    const type = url.searchParams.get("type") || "conversations";

    if (type === "metrics") {
      return exportMetrics(merchantId, dateFrom, dateTo);
    }

    return exportConversations(merchantId, dateFrom, dateTo);
  } catch (error: any) {
    console.error("Export error:", error);
    return new Response("Failed to generate export", { status: 500 });
  }
}

async function exportConversations(merchantId: number, dateFrom: string | null, dateTo: string | null) {
  let whereConditions = ["cs.merchant_id = $1"];
  const queryParams: any[] = [merchantId];
  let paramIndex = 2;

  if (dateFrom) {
    whereConditions.push(`cs.started_at >= $${paramIndex++}`);
    queryParams.push(dateFrom);
  }

  if (dateTo) {
    whereConditions.push(`cs.started_at <= $${paramIndex++}`);
    queryParams.push(dateTo);
  }

  const whereClause = whereConditions.join(" AND ");

  const result = await query(
    `SELECT
       cs.session_id,
       cs.customer_email,
       cs.started_at,
       ca.message_count,
       ca.is_resolved,
       ca.intent_primary,
       ca.sentiment_score,
       ca.duration_seconds
     FROM chat_sessions cs
     LEFT JOIN conversation_analytics ca ON cs.session_id = ca.session_id
     WHERE ${whereClause}
     ORDER BY cs.started_at DESC`,
    queryParams
  );

  const headers = [
    "Session ID",
    "Customer Email",
    "Started At",
    "Messages",
    "Resolved",
    "Primary Intent",
    "Sentiment Score",
    "Duration (sec)"
  ];

  const rows = result.rows.map(row => [
    row.session_id,
    row.customer_email || "Anonymous",
    row.started_at,
    row.message_count || 0,
    row.is_resolved ? "Yes" : "No",
    row.intent_primary || "N/A",
    row.sentiment_score || "N/A",
    row.duration_seconds || 0
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
  ].join("\n");

  return new Response(csvContent, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="conversations-export-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
}

async function exportMetrics(merchantId: number, dateFrom: string | null, dateTo: string | null) {
  let whereConditions = ["merchant_id = $1"];
  const queryParams: any[] = [merchantId];
  let paramIndex = 2;

  if (dateFrom) {
    whereConditions.push(`metric_date >= $${paramIndex++}`);
    queryParams.push(dateFrom);
  }

  if (dateTo) {
    whereConditions.push(`metric_date <= $${paramIndex++}`);
    queryParams.push(dateTo);
  }

  const whereClause = whereConditions.join(" AND ");

  const result = await query(
    `SELECT * FROM dashboard_metrics WHERE ${whereClause} ORDER BY metric_date DESC`,
    queryParams
  );

  const headers = [
    "Date",
    "Total Conversations",
    "Resolved Conversations",
    "Total Messages",
    "Avg Response Time (sec)",
    "Sentiment Positive",
    "Sentiment Neutral",
    "Sentiment Negative"
  ];

  const rows = result.rows.map(row => [
    row.metric_date,
    row.total_conversations,
    row.resolved_conversations,
    row.total_messages,
    (row.avg_response_time_ms / 1000).toFixed(1),
    row.sentiment_scores?.positive || 0,
    row.sentiment_scores?.neutral || 0,
    row.sentiment_scores?.negative || 0
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
  ].join("\n");

  return new Response(csvContent, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="analytics-export-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
}
