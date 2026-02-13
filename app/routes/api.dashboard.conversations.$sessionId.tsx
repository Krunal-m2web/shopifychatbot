/**
 * Dashboard Conversations API
 * Returns conversation history with pagination and filters
 */

import type { Route } from "./+types/api.dashboard.conversations.$sessionId";
import { query } from "~/utils/db.server";

export async function loader({ request, params }: Route.LoaderArgs) {
  try {
    const sessionId = params.sessionId;

    // If sessionId is provided, return individual conversation
    if (sessionId) {
      return getConversationDetails(sessionId);
    }

    // Otherwise, return paginated conversation list
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const status = url.searchParams.get("status") || "all"; // all, resolved, unresolved
    const dateFrom = url.searchParams.get("dateFrom");
    const dateTo = url.searchParams.get("dateTo");
    const merchantId = parseInt(url.searchParams.get("merchantId") || "1");

    const offset = (page - 1) * limit;

    // Build query
    let whereConditions = ["cs.merchant_id = $1"];
    const queryParams: any[] = [merchantId];
    let paramIndex = 2;

    if (status === "resolved") {
      whereConditions.push(`ca.is_resolved = true`);
    } else if (status === "unresolved") {
      whereConditions.push(`(ca.is_resolved = false OR ca.is_resolved IS NULL)`);
    }

    if (dateFrom) {
      whereConditions.push(`cs.started_at >= $${paramIndex++}`);
      queryParams.push(dateFrom);
    }

    if (dateTo) {
      whereConditions.push(`cs.started_at <= $${paramIndex++}`);
      queryParams.push(dateTo);
    }

    const whereClause = whereConditions.join(" AND ");

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total
       FROM chat_sessions cs
       LEFT JOIN conversation_analytics ca ON cs.session_id = ca.session_id
       WHERE ${whereClause}`,
      queryParams
    );

    const totalCount = parseInt(countResult.rows[0]?.total || "0");

    // Get conversations
    queryParams.push(limit, offset);
    const conversationsResult = await query(
      `SELECT
         cs.session_id,
         cs.customer_email,
         cs.started_at,
         cs.ended_at,
         ca.message_count,
         ca.is_resolved,
         ca.resolution_type,
         ca.intent_primary,
         ca.duration_seconds,
         ca.sentiment_score,
         ca.products_mentioned
       FROM chat_sessions cs
       LEFT JOIN conversation_analytics ca ON cs.session_id = ca.session_id
       WHERE ${whereClause}
       ORDER BY cs.started_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      queryParams
    );

    const conversations = conversationsResult.rows.map((row) => ({
      sessionId: row.session_id,
      customerEmail: row.customer_email,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      messageCount: row.message_count || 0,
      isResolved: row.is_resolved || false,
      resolutionType: row.resolution_type,
      intentPrimary: row.intent_primary,
      durationSeconds: row.duration_seconds,
      sentimentScore: row.sentiment_score ? parseFloat(row.sentiment_score) : null,
      productsMentioned: row.products_mentioned || [],
    }));

    return Response.json({
      conversations,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      filters: { status, dateFrom, dateTo },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Dashboard conversations error:", error);
    return Response.json(
      { error: "Failed to fetch conversations", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Get detailed conversation with all messages
 */
async function getConversationDetails(sessionId: string) {
  try {
    // Get session info
    const sessionResult = await query(
      `SELECT
         cs.*,
         ca.message_count,
         ca.is_resolved,
         ca.resolution_type,
         ca.intent_primary,
         ca.duration_seconds,
         ca.sentiment_score,
         ca.products_mentioned
       FROM chat_sessions cs
       LEFT JOIN conversation_analytics ca ON cs.session_id = ca.session_id
       WHERE cs.session_id = $1`,
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return Response.json({ error: "Conversation not found" }, { status: 404 });
    }

    const session = sessionResult.rows[0];

    // Get all messages
    const messagesResult = await query(
      `SELECT id, role, content, created_at
       FROM chat_messages
       WHERE session_id = $1
       ORDER BY created_at ASC`,
      [sessionId]
    );

    const messages = messagesResult.rows.map((row) => ({
      id: row.id,
      role: row.role,
      content: row.content,
      createdAt: row.created_at,
    }));

    return Response.json({
      conversation: {
        sessionId: session.session_id,
        customerEmail: session.customer_email,
        startedAt: session.started_at,
        endedAt: session.ended_at,
        messageCount: session.message_count || 0,
        isResolved: session.is_resolved || false,
        resolutionType: session.resolution_type,
        intentPrimary: session.intent_primary,
        durationSeconds: session.duration_seconds,
        sentimentScore: session.sentiment_score ? parseFloat(session.sentiment_score) : null,
        productsMentioned: session.products_mentioned || [],
        metadata: session.metadata || {},
      },
      messages,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error fetching conversation details:", error);
    return Response.json(
      { error: "Failed to fetch conversation", details: error.message },
      { status: 500 }
    );
  }
}
