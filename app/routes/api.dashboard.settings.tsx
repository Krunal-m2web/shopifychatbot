/**
 * Dashboard Settings API
 * Handles merchant settings for chat widget, AI config, and RAG
 */

import type { Route } from "./+types/api.dashboard.settings";
import { query } from "~/utils/db.server";

export async function loader({ request }: Route.LoaderArgs) {
  try {
    const url = new URL(request.url);
    const merchantId = parseInt(url.searchParams.get("merchantId") || "1");

    // Get merchant settings
    const result = await query(
      `SELECT * FROM merchant_settings WHERE merchant_id = $1`,
      [merchantId]
    );

    if (result.rows.length === 0) {
      // Check if merchant exists
      const merchantExists = await query(
        `SELECT id FROM merchants WHERE id = $1`,
        [merchantId]
      );

      if (merchantExists.rows.length === 0) {
        return Response.json(
          { error: `Merchant with ID ${merchantId} not found. Please ensure the database is seeded.` },
          { status: 404 }
        );
      }

      // Create default settings if none exist
      const createResult = await query(
        `INSERT INTO merchant_settings (merchant_id)
         VALUES ($1)
         RETURNING *`,
        [merchantId]
      );

      const settings = createResult.rows[0];
      return Response.json({
        chatWidget: settings.chat_widget_config,
        aiConfig: settings.ai_config,
        ragSettings: settings.rag_settings,
        notificationSettings: settings.notification_settings,
      });
    }

    const settings = result.rows[0];
    return Response.json({
      chatWidget: settings.chat_widget_config,
      aiConfig: settings.ai_config,
      ragSettings: settings.rag_settings,
      notificationSettings: settings.notification_settings,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error fetching settings:", error);
    return Response.json(
      { error: "Failed to fetch settings", details: error.message },
      { status: 500 }
    );
  }
}

export async function action({ request }: Route.ActionArgs) {
  try {
    const body = await request.json();
    const { merchantId, chatWidget, aiConfig, ragSettings, notificationSettings } = body;

    if (!merchantId) {
      return Response.json({ error: "merchantId required" }, { status: 400 });
    }

    // Validate settings
    if (chatWidget) {
      validateChatWidgetConfig(chatWidget);
    }

    if (aiConfig) {
      validateAIConfig(aiConfig);
    }

    // Update settings
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (chatWidget) {
      updateFields.push(`chat_widget_config = $${paramIndex++}`);
      values.push(JSON.stringify(chatWidget));
    }

    if (aiConfig) {
      updateFields.push(`ai_config = $${paramIndex++}`);
      values.push(JSON.stringify(aiConfig));
    }

    if (ragSettings) {
      updateFields.push(`rag_settings = $${paramIndex++}`);
      values.push(JSON.stringify(ragSettings));
    }

    if (notificationSettings) {
      updateFields.push(`notification_settings = $${paramIndex++}`);
      values.push(JSON.stringify(notificationSettings));
    }

    if (updateFields.length === 0) {
      return Response.json({ error: "No settings to update" }, { status: 400 });
    }

    values.push(merchantId);

    await query(
      `UPDATE merchant_settings
       SET ${updateFields.join(", ")}, updated_at = CURRENT_TIMESTAMP
       WHERE merchant_id = $${paramIndex}`,
      values
    );

    return Response.json({
      success: true,
      message: "Settings updated successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error updating settings:", error);
    const status = error.message.includes("Invalid") || error.message.includes("must be") || error.message.includes("too long") ? 400 : 500;
    return Response.json(
      { error: "Failed to update settings", details: error.message },
      { status }
    );
  }
}

/**
 * Validate chat widget configuration
 */
function validateChatWidgetConfig(config: any): void {
  if (!config.primaryColor || !/^#[0-9A-Fa-f]{6}$/.test(config.primaryColor)) {
    throw new Error("Invalid primaryColor format. Must be hex color (e.g., #5C6AC4)");
  }

  if (config.secondaryColor && !/^#[0-9A-Fa-f]{6}$/.test(config.secondaryColor)) {
    throw new Error("Invalid secondaryColor format. Must be hex color (e.g., #2E5C8A)");
  }

  const validPositions = ["bottom-right", "bottom-left", "top-right", "top-left"];
  if (!validPositions.includes(config.position)) {
    throw new Error(`Invalid position. Must be one of: ${validPositions.join(", ")}`);
  }

  if (config.welcomeMessage && config.welcomeMessage.length > 200) {
    throw new Error("welcomeMessage must be 200 characters or less");
  }

  if (config.borderRadius !== undefined && (config.borderRadius < 0 || config.borderRadius > 40)) {
    throw new Error("borderRadius must be between 0 and 40");
  }

  if (config.avatarUrl && config.avatarUrl.length > 1000) {
    throw new Error("avatarUrl is too long");
  }
}

/**
 * Validate AI configuration
 */
function validateAIConfig(config: any): void {
  const validModels = [
    "claude-3-5-sonnet",
    "claude-3-opus",
    "claude-3-sonnet",
    "gpt-4-turbo",
    "gpt-4",
    "gpt-3.5-turbo",
  ];

  if (!validModels.includes(config.model)) {
    throw new Error(`Invalid model. Must be one of: ${validModels.join(", ")}`);
  }

  if (config.temperature < 0 || config.temperature > 1) {
    throw new Error("temperature must be between 0 and 1");
  }

  if (config.maxTokens < 100 || config.maxTokens > 4000) {
    throw new Error("maxTokens must be between 100 and 4000");
  }
}
