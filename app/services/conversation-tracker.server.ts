/**
 * Conversation Tracker Service
 * Tracks conversation metadata in real-time as messages are sent
 */

import { query } from "~/utils/db.server";

export interface ConversationMetadata {
  sessionId: string;
  merchantId: number;
  messageCount: number;
  durationSeconds?: number;
  isResolved?: boolean;
  resolutionType?: "auto" | "handoff" | "abandoned";
  sentimentScore?: number;
  intentPrimary?: string;
  productsMentioned?: string[];
}

/**
 * Initialize or update conversation analytics for a session
 */
export async function trackConversation(
  sessionId: string,
  updates: Partial<ConversationMetadata>
): Promise<void> {
  try {
    // Get or create conversation analytics record
    const existing = await query(
      "SELECT * FROM conversation_analytics WHERE session_id = $1",
      [sessionId]
    );

    if (existing.rows.length === 0) {
      // Create new record
      await query(
        `INSERT INTO conversation_analytics 
         (session_id, merchant_id, message_count, intent_primary, products_mentioned)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          sessionId,
          updates.merchantId || null,
          updates.messageCount || 0,
          updates.intentPrimary || null,
          updates.productsMentioned || [],
        ]
      );
    } else {
      // Update existing record
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.messageCount !== undefined) {
        updateFields.push(`message_count = $${paramIndex++}`);
        values.push(updates.messageCount);
      }

      if (updates.durationSeconds !== undefined) {
        updateFields.push(`duration_seconds = $${paramIndex++}`);
        values.push(updates.durationSeconds);
      }

      if (updates.isResolved !== undefined) {
        updateFields.push(`is_resolved = $${paramIndex++}`);
        values.push(updates.isResolved);
      }

      if (updates.resolutionType !== undefined) {
        updateFields.push(`resolution_type = $${paramIndex++}`);
        values.push(updates.resolutionType);
      }

      if (updates.sentimentScore !== undefined) {
        updateFields.push(`sentiment_score = $${paramIndex++}`);
        values.push(updates.sentimentScore);
      }

      if (updates.intentPrimary !== undefined) {
        updateFields.push(`intent_primary = $${paramIndex++}`);
        values.push(updates.intentPrimary);
      }

      if (updates.productsMentioned !== undefined) {
        updateFields.push(`products_mentioned = $${paramIndex++}`);
        values.push(updates.productsMentioned);
      }

      if (updateFields.length > 0) {
        values.push(sessionId);
        await query(
          `UPDATE conversation_analytics 
           SET ${updateFields.join(", ")}, updated_at = CURRENT_TIMESTAMP
           WHERE session_id = $${paramIndex}`,
          values
        );
      }
    }
  } catch (error) {
    console.error("Error tracking conversation:", error);
    throw error;
  }
}

/**
 * Mark a conversation as resolved
 */
export async function markConversationResolved(
  sessionId: string,
  resolutionType: "auto" | "handoff" | "abandoned"
): Promise<void> {
  await trackConversation(sessionId, {
    isResolved: true,
    resolutionType,
  });
}

/**
 * Calculate conversation duration and mark as ended
 */
export async function endConversation(sessionId: string): Promise<void> {
  try {
    // Get session start time
    const sessionResult = await query(
      "SELECT started_at FROM chat_sessions WHERE session_id = $1",
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return;
    }

    const startedAt = new Date(sessionResult.rows[0].started_at);
    const now = new Date();
    const durationSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000);

    // Update session end time
    await query(
      "UPDATE chat_sessions SET ended_at = $1 WHERE session_id = $2",
      [now, sessionId]
    );

    // Update conversation analytics with duration
    await trackConversation(sessionId, {
      durationSeconds,
    });
  } catch (error) {
    console.error("Error ending conversation:", error);
  }
}

/**
 * Increment message count for a conversation
 */
export async function incrementMessageCount(sessionId: string, merchantId: number): Promise<void> {
  try {
    const result = await query(
      "SELECT message_count FROM conversation_analytics WHERE session_id = $1",
      [sessionId]
    );

    const currentCount = result.rows[0]?.message_count || 0;
    await trackConversation(sessionId, {
      merchantId,
      messageCount: currentCount + 1,
    });
  } catch (error) {
    console.error("Error incrementing message count:", error);
  }
}

/**
 * Add products mentioned in the conversation
 */
export async function trackProductMentions(
  sessionId: string,
  products: string[]
): Promise<void> {
  try {
    const result = await query(
      "SELECT products_mentioned FROM conversation_analytics WHERE session_id = $1",
      [sessionId]
    );

    const existingProducts = result.rows[0]?.products_mentioned || [];
    const uniqueProducts = Array.from(new Set([...existingProducts, ...products]));

    await trackConversation(sessionId, {
      productsMentioned: uniqueProducts,
    });
  } catch (error) {
    console.error("Error tracking product mentions:", error);
  }
}
