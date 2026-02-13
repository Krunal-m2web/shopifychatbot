import { data } from "react-router";
import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { syncAllProducts } from "../services/shopify-sync.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  try {
    await syncAllProducts(shop);
    return data({ success: true, message: "Sync completed successfully" });
  } catch (error: any) {
    console.error("Sync error:", error);
    return data({ success: false, error: error.message }, { status: 500 });
  }
};
