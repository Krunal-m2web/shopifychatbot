/**
 * Storefront Settings API
 * Publicly accessible endpoint for the chat widget to fetch branding configuration
 */

import type { Route } from "./+types/api.shop.settings";
import { query } from "../utils/pg.server";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Private-Network": "true"
};

export async function action({ request }: Route.ActionArgs) {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers });
  }
  return new Response(null, { status: 405 });
}

export async function loader({ request }: Route.LoaderArgs) {
  try {
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");
    const merchantId = url.searchParams.get("merchantId");

    if (request.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    if (!shop && !merchantId) {
      return Response.json(
        { error: "shop or merchantId parameter is required" }, 
        { status: 400, headers }
      );
    }

    // Fetch settings by merchantId or shop domain
    let result;
    if (merchantId) {
      result = await query(
        `SELECT chat_widget_config FROM merchant_settings WHERE merchant_id = $1`,
        [parseInt(merchantId)]
      );
    } else {
      return Response.json({ error: "Shop domain lookup not yet implemented" }, { status: 501, headers });
    }

    if (result.rows.length === 0) {
      return Response.json({ error: "Merchant not found" }, { status: 404, headers });
    }

    return Response.json({
      settings: result.rows[0].chat_widget_config,
      timestamp: new Date().toISOString()
    }, { headers });
  } catch (error: any) {
    console.error("Error fetching storefront settings:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500, headers }
    );
  }
}
