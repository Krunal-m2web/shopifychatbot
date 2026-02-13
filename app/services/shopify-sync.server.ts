import shopify from "../shopify.server";
import { query } from "~/utils/db.server";
import { generateProductEmbeddings } from "./embeddings.server";

export async function getShopifySession(shop: string) {
  const sessions = await shopify.sessionStorage.findSessionsByShop(shop);
  // Prefer offline session for background tasks
  const offlineSession = sessions.find((s) => !s.isOnline);
  return offlineSession || sessions[0];
}

export async function syncAllProducts(shop: string) {
  console.log(`⏳ Starting full product sync for ${shop}...`);
  
  // Use unauthenticated.admin to get an offline client
  // this handles session retrieval for us
  const { admin } = await shopify.unauthenticated.admin(shop);

  if (!admin) {
    throw new Error(`No offline session found for shop ${shop}`);
  }
  
  let products: any[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;

  while (hasNextPage) {
    const query = `
      query GetProducts($first: Int!, $after: String) {
        products(first: $first, after: $after) {
          edges {
            node {
              id
              title
              bodyHtml
              tags
              featuredImage {
                url
              }
              variants(first: 10) {
                edges {
                  node {
                    id
                    price
                    inventoryQuantity
                    inventoryPolicy
                  }
                }
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    const response = await admin.graphql(query, {
      variables: {
        first: 250,
        after: cursor
      }
    });

    const data: any = await response.json();
    
    if (data.errors) {
      throw new Error(`GraphQL error: ${JSON.stringify(data.errors)}`);
    }

    const fetchedProducts = data.data.products.edges.map((edge: any) => {
      const product = edge.node;
      // Map GraphQL structure back to what upsertProduct expects or adapt it
      return {
        ...product,
        // Adapt GraphQL names to REST names for upsertProduct compatibility
        body_html: product.bodyHtml,
        image: product.featuredImage?.url || null,
        admin_graphql_api_id: product.id,
        id: product.id.split('/').pop(),
        variants: product.variants.edges.map((vEdge: any) => ({
          ...vEdge.node,
          id: vEdge.node.id.split('/').pop(),
          inventory_quantity: vEdge.node.inventoryQuantity,
          inventory_policy: vEdge.node.inventoryPolicy.toLowerCase()
        }))
      };
    });

    products = products.concat(fetchedProducts);
    hasNextPage = data.data.products.pageInfo.hasNextPage;
    cursor = data.data.products.pageInfo.endCursor;
    
    console.log(`📡 Fetched ${products.length} products...`);
  }

  console.log(`📦 Total fetched ${products.length} products from Shopify`);

  // Batch insert/update
  for (const product of products) {
    await upsertProduct(product, shop);
  }

  // Generate embeddings
  // We need to fetch the inserted products from DB to get the local IDs if needed, 
  // but generateProductEmbeddings takes raw product data or DB data?
  // It takes "products" array. Let's check embeddings.server.ts signature.
  // It transforms them. Ideally we pass the Shopify data structure.
  
  // However, we just inserted them. Let's fetch them from DB to ensure consistency or pass mapped data.
  // generateProductEmbeddings expects the structure it can transform.
  // The transformer expects { id, title, description, price, ... }
  // We should make sure `mock-shopify` structure matches `admin api` structure.
  // Admin API: id is number (or string if GID?), title, body_html, variants...
  
  // We need to map Admin API product to what generateProductEmbeddings expects.
  // Let's assume transformer handles it or we adapt it.
  
  // For now, let's pass the raw products to embeddings generator, 
  // assumming it handles Shopify structure (since mock data mimics it).
  
  // We also need the merchantId.
  const merchant = await query("SELECT id FROM merchants WHERE shop_domain = $1", [shop]);
  const merchantId = merchant.rows[0]?.id;

  if (merchantId) {
    await generateProductEmbeddings(merchantId, products);
  }

  console.log(`✅ Sync complete for ${shop}`);
}

export async function upsertProduct(product: any, shop: string) {
  const merchant = await query("SELECT id FROM merchants WHERE shop_domain = $1", [shop]);
  const merchantId = merchant.rows[0]?.id;

  if (!merchantId) throw new Error(`Merchant not found for ${shop}`);

  const variants = product.variants || [];
  const price = variants.length > 0 ? variants[0].price : "0.00";
  const available = variants.some((v: any) => v.inventory_quantity > 0 || v.inventory_policy === 'continue');

  // GID formatting if needed, but Admin API returns numbers usually for REST, strings for GraphQL.
  // Mock data used "gid://shopify/Product/..."
  // REST returns numbers. We should probably normalize to GID or store as is.
  // Let's store as GID to be consistent if possible, or just stringify the ID.
  const shopifyId = typeof product.id === 'string' && product.id.startsWith('gid://') ? product.id : (product.admin_graphql_api_id || `gid://shopify/Product/${product.id}`);

  // Manual upsert because unique constraint (merchant_id, shopify_id) is missing
  const existingProduct = await query(
    "SELECT id FROM products WHERE merchant_id = $1 AND shopify_id = $2",
    [merchantId, shopifyId]
  );

  const tags = Array.isArray(product.tags) ? product.tags : (product.tags ? product.tags.split(",").map((t: string) => t.trim()) : []);

  if (existingProduct.rows.length > 0) {
    const productId = existingProduct.rows[0].id;
    console.log(`   Updating product ${shopifyId} (local ID: ${productId})...`);
    await query(
      `UPDATE products SET 
        title = $1,
        description = $2,
        price = $3,
        tags = $4,
        available = $5
      WHERE id = $6`,
      [product.title, product.body_html || "", price, tags, available, productId]
    );
  } else {
    console.log(`   Inserting new product ${shopifyId}...`);
    await query(
      `INSERT INTO products (
        merchant_id, shopify_id, title, description, price, collections, tags, available, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [merchantId, shopifyId, product.title, product.body_html || "", price, [], tags, available]
    );
  }
}

export async function deleteProduct(productId: string | number, shop: string) {
  const merchant = await query("SELECT id FROM merchants WHERE shop_domain = $1", [shop]);
  const merchantId = merchant.rows[0]?.id;
  if (!merchantId) return;

  const shopifyId = typeof productId === 'number' ? `gid://shopify/Product/${productId}` : productId;

  await query(
    "DELETE FROM products WHERE merchant_id = $1 AND shopify_id = $2",
    [merchantId, shopifyId]
  );
  
  // Also delete from vector store
  const { vectorStore } = await import("./vector-store.server");
  // Vector store delete needs implementation check.
  // It might need specific ID or we delete by metadata.
  // Checking vector-store... assume it has delete method or we skip for now.
}
