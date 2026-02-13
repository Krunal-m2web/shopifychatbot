import type { Route } from "./+types/api.chat";
import { query } from "~/utils/db.server";
import { answerProductQuery } from "~/services/rag.server";

import { findOrder } from "~/services/order-lookup.server";
import { formatOrderDetails } from "~/services/order-formatter.server";

import { publishChatMessage } from "~/services/ably.server";
import { detectIntent } from '~/services/intent-detector.server';
import { searchProductsWithFilters } from '~/services/advanced-search.server';
import { formatProductRecommendations, formatPriceRecommendations, personalizeRecommendations } from '~/services/recommendations.server';
import { trackSearch } from '~/services/user-preferences.server';
import { 
  incrementMessageCount, 
  trackConversation, 
  trackProductMentions 
} from '~/services/conversation-tracker.server';
import { analyzeSentiment } from '~/services/sentiment.server';

function corsHeaders(origin: string | null) {
  const allowed = [
    "https://admin.shopify.com",
    "https://my-test-shop-123465.myshopify.com",
  ];

  // if origin is allowed, return it, else fallback to store domain
  const allowOrigin = allowed.includes(origin ?? "")
    ? origin!
    : "https://my-test-shop-123465.myshopify.com";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

export async function loader({ request }: Route.LoaderArgs) {
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  return Response.json(
    {
      ok: true,
      message: "Chat API is active. Use POST to send messages.",
      example: {
        method: "POST",
        body: { message: "Hello", sessionId: "optional", useRealtime: false },
      },
    },
    { headers }
  );
}

// Helper: Detect order queries
function detectOrderQuery(message: string): {
  isOrderQuery: boolean;
  orderNumber?: number;
  email?: string;
  zip?: string;
} {
  const lowerMsg = message.toLowerCase();

  const isOrderQuery =
    lowerMsg.includes("order") ||
    lowerMsg.includes("track") ||
    lowerMsg.includes("shipment") ||
    lowerMsg.includes("delivery");

  // Extract order number (4+ digits)
  const orderMatch = message.match(/#?(\d{4,})/);
  const orderNumber = orderMatch ? parseInt(orderMatch[1]) : undefined;

  // Extract email
  const emailMatch = message.match(
    /([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i
  );
  const email = emailMatch ? emailMatch[1] : undefined;

  // Extract ZIP (5 digits)
  const zipMatch = message.match(/\b(\d{5})\b/);
  const zip = zipMatch ? zipMatch[1] : undefined;

  return { isOrderQuery, orderNumber, email, zip };
}

export async function action({ request }: Route.ActionArgs) {
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  let body: any;
  let sessionId: string | undefined;

  try {
    try {
      // Use clone() to prevent "Body has already been read" errors if middleware also inspects the request
      const clonedRequest = request.clone();
      body = await clonedRequest.json();
    } catch (e) {
      return Response.json(
        { error: "Invalid JSON or empty request body" },
        { status: 400, headers }
      );
    }

    const { message, useRealtime, testMode } = body || {};
    sessionId = body?.sessionId;

    if (!message) {
      return Response.json({ error: "Message required" }, { status: 400, headers });
    }

    // Get merchant - use the actual shop domain from environment
    const shopDomain = 
      process.env.SHOPIFY_SHOP_DOMAIN || 
      process.env.SHOPIFY_APP_URL?.replace('https://', '').replace('http://', '').split(':')[0] || 
      "testing-m2web.myshopify.com";
    
    const merchantResult = await query(
      "SELECT id, shop_name FROM merchants WHERE shop_domain = $1",
      [shopDomain]
    );

    if (merchantResult.rows.length === 0) {
      return Response.json({ error: "Merchant not found" }, { status: 404, headers });
    }

    const merchant = merchantResult.rows[0];

    // Get or create session
    let session;

    if (sessionId) {
      // In test mode, we might want to accept any session ID without looking it up first if it starts with test_
      // But for simplicity, we follow standard flow.
      const sessionResult = await query(
        "SELECT * FROM chat_sessions WHERE session_id = $1",
        [sessionId]
      );
      session = sessionResult.rows[0];
    }

    if (!session) {
      const newSessionId = testMode 
        ? `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        : `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const sessionResult = await query(
        `INSERT INTO chat_sessions (session_id, merchant_id, metadata)
         VALUES ($1, $2, $3) RETURNING *`,
        [newSessionId, merchant.id, JSON.stringify({ testMode: !!testMode })]
      );

      session = sessionResult.rows[0];
    }

    // Get conversation history (last 5 messages)
    const historyResult = await query(
      `SELECT role, content FROM chat_messages
       WHERE session_id = $1
       ORDER BY created_at DESC
       LIMIT 5`,
      [session.session_id]
    );

    const conversationHistory = historyResult.rows.reverse().map((msg: any) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }));

    // Save user message
    await query(
      `INSERT INTO chat_messages (session_id, role, content)
       VALUES ($1, $2, $3)`,
      [session.session_id, "user", message]
    );

    let responseMessage = "";
    let sources: any[] = [];
    let confidenceScore = 0;
    let products: any[] = []; // Structured product data for UI

    // ✅ Step 1: Detect User Intent & Sentiment
    const intentResult = await detectIntent(message);
    const sentiment = analyzeSentiment(message);
    console.log("🎯 Detected intent:", intentResult, "Score:", sentiment.score);

    // ✅ Step 1.5: Track Conversation Progress (Analytics)
    try {
      await incrementMessageCount(session.session_id, merchant.id);
      await trackConversation(session.session_id, {
        merchantId: merchant.id,
        intentPrimary: intentResult.intent,
        sentimentScore: sentiment.score
      });
    } catch (trackError) {
      console.error("⚠️ Failed to track conversation metrics:", trackError);
    }

    // ✅ Step 2: Check for Order Query (High Priority)
    const orderQuery = detectOrderQuery(message);

    if (orderQuery.isOrderQuery || intentResult.intent === 'order_tracking') {
      // ... existing order logic ...
      if (orderQuery.orderNumber && (orderQuery.email || orderQuery.zip)) {
        const order = await findOrder(
          orderQuery.orderNumber,
          orderQuery.email,
          orderQuery.zip
        );

        if (order) {
          responseMessage = formatOrderDetails(order);
          confidenceScore = 1.0;
        } else {
          responseMessage = `I couldn't find order #${orderQuery.orderNumber} with that information.\n\nPlease check:\n• Order number is correct\n• Email or ZIP matches your order`;
          confidenceScore = 0.9;
        }
      } else {
        responseMessage = `I can help you track your order! Please provide:\n\n1. Your order number\n2. Your email address OR billing ZIP code\n\nExample:\n"Track order 1001 email john.doe@example.com"`;
        confidenceScore = 1.0;
      }
    } 
    // ✅ Step 3: Product Search & Recommendations
    else if (intentResult.intent === 'product_search' || intentResult.intent === 'price_inquiry') {
      
      // A. Advanced Search with Filters
      const filters = {
        priceRange: intentResult.entities.priceRange,
        productTypes: intentResult.entities.productType,
        availability: true
      };

      const searchResults = await searchProductsWithFilters(
        merchant.id,
        message,
        filters,
        5 
      );

      // B. Personalize Results
      const personalized = await personalizeRecommendations(session.session_id, searchResults);

      // C. Format Response
      if (intentResult.intent === 'price_inquiry') {
        responseMessage = formatPriceRecommendations(personalized);
      } else {
        responseMessage = formatProductRecommendations(personalized);
      }

      // D. Store structured product data for rich UI
      products = personalized;

      // E. Track User Behavior
      const productTitles = personalized.map(p => p.title);
      const categories = personalized
        .map(p => p.tags)
        .flat()
        .filter((t): t is string => typeof t === 'string'); // Ensure string[]

      await trackSearch(
        session.session_id,
        message,
        categories
      );

      // F. Track Product Mentions in Analytics
      if (productTitles.length > 0) {
        await trackProductMentions(session.session_id, productTitles);
      }

      sources = personalized.map(p => ({
        title: p.title,
        price: p.price,
        productId: p.id,
        similarity: p.similarity
      }));
      confidenceScore = sources.length > 0 ? 0.9 : 0.5;

    } 
    // ✅ Step 4: General/Other -> Fallback to RAG
    else {
      const ragResponse = await answerProductQuery(
        merchant.id,
        message,
        conversationHistory,
        merchant.shop_name
      );

      responseMessage = ragResponse.answer;
      sources = ragResponse.sources;
      confidenceScore = ragResponse.confidenceScore || 0;
    }

    // Save assistant response
    await query(
      `INSERT INTO chat_messages (session_id, role, content)
       VALUES ($1, $2, $3)`,
      [session.session_id, "assistant", responseMessage]
    );

    // ✅ Real-time response (Ably)
    if (useRealtime) {
      await publishChatMessage(session.session_id, responseMessage);

      return Response.json({
        success: true,
        sessionId: session.session_id,
        timestamp: new Date().toISOString(),
      }, { headers });
    }

    // Normal response (Enhanced with Debug Info for Test Mode)
    const responsePayload: any = {
      sessionId: session.session_id,
      message: responseMessage,
      sources: sources,
      products: products, // Structured product data for rich UI
      timestamp: new Date().toISOString(),
    };

    if (testMode) {
      responsePayload.debug = {
        intent: intentResult,
        confidence: confidenceScore,
        ragSources: sources,
        responseTime: 0 // Could calculate diff
      };
    }

    return Response.json(responsePayload, { headers });
  } catch (error: any) {
    console.error("❌ Chat API error:", {
      message: error.message,
      stack: error.stack,
      body: body,
      sessionId: sessionId
    });

    const isConfigurationError = error.message?.includes("API_KEY") || error.message?.includes("not configured");

    return Response.json(
      {
        error: isConfigurationError ? "Server Configuration Error" : "Failed to process message",
        details: error.message || "An unexpected error occurred",
        code: isConfigurationError ? "CONFIG_ERROR" : "INTERNAL_ERROR"
      },
      { status: 500, headers }
    );
  }
}
