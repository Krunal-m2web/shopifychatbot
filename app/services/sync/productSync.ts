import { AdminApiContext } from '@shopify/shopify-app-react-router/server';
import { vectorStore } from '../vectorStore';
import { generateEmbeddings } from '../rag/embeddings';
import { v4 as uuidv4 } from 'uuid';

export interface SyncResult {
  synced: number;
  errors: number;
  duration: number;
}

interface Product {
  id: string;
  title: string;
  descriptionHtml: string;
  productType: string;
  tags: string[];
  vendor: string;
  variants: {
    edges: Array<{
      node: {
        price: string;
        sku: string;
        inventoryQuantity: number;
      };
    }>;
  };
}

/**
 * Strip HTML tags from a string
 */
function stripHTML(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Build searchable text content from product data
 */
function buildProductContent(product: Product): string {
  const description = stripHTML(product.descriptionHtml || '');
  const prices = product.variants.edges.map(e => `$${e.node.price}`).join(', ');
  const skus = product.variants.edges.map(e => e.node.sku).filter(Boolean).join(', ');

  return `
    Product: ${product.title}
    ${description}
    Type: ${product.productType || 'General'}
    Vendor: ${product.vendor || 'Unknown'}
    Prices: ${prices}
    ${skus ? `SKUs: ${skus}` : ''}
    Tags: ${product.tags.join(', ')}
  `.trim();
}

/**
 * Calculate price range category
 */
function getPriceRange(variants: Product['variants']): string {
  const prices = variants.edges.map(e => parseFloat(e.node.price));
  const min = Math.min(...prices);
  const max = Math.max(...prices);

  if (max < 25) return '0-25';
  if (max < 50) return '25-50';
  if (max < 100) return '50-100';
  if (max < 200) return '100-200';
  return '200+';
}

/**
 * Check if any variant is in stock
 */
function isInStock(variants: Product['variants']): boolean {
  return variants.edges.some(e => e.node.inventoryQuantity > 0);
}

/**
 * Sync all products from Shopify to the vector store
 */
export async function syncProducts(
  admin: AdminApiContext,
  merchantId: string
): Promise<SyncResult> {
  const startTime = Date.now();
  let synced = 0;
  let errors = 0;

  try {
    let hasNextPage = true;
    let cursor: string | null = null;

    while (hasNextPage) {
      const response = await admin.graphql(
        `#graphql
          query getProducts($cursor: String) {
            products(first: 50, after: $cursor) {
              pageInfo {
                hasNextPage
                endCursor
              }
              edges {
                node {
                  id
                  title
                  descriptionHtml
                  productType
                  tags
                  vendor
                  variants(first: 10) {
                    edges {
                      node {
                        price
                        sku
                        inventoryQuantity
                      }
                    }
                  }
                }
              }
            }
          }
        `,
        { variables: { cursor } }
      );

      const data = await response.json();
      const products = data.data?.products?.edges || [];

      if (products.length === 0) break;

      // Build document batch
      const documents = products.map((edge: any) => {
        const product = edge.node as Product;
        const content = buildProductContent(product);

        return {
          content,
          shopifyId: product.id,
          priceRange: getPriceRange(product.variants),
          inStock: isInStock(product.variants),
          tags: product.tags,
        };
      });

      // Generate embeddings in batch
      const contents = documents.map(d => d.content);
      const embeddings = await generateEmbeddings(contents);

      // Upsert to vector store
      const vectorDocs = documents.map((doc, i) => ({
        id: uuidv4(),
        content: doc.content,
        embedding: embeddings[i],
        metadata: {
          merchantId,
          docType: 'product' as const,
          shopifyId: doc.shopifyId,
          priceRange: doc.priceRange,
          inStock: doc.inStock,
          tags: doc.tags,
        },
      }));

      await vectorStore.upsert(vectorDocs);
      synced += vectorDocs.length;

      // Move to next page
      hasNextPage = data.data?.products?.pageInfo?.hasNextPage || false;
      cursor = data.data?.products?.pageInfo?.endCursor || null;

      console.log(`✅ Synced ${synced} products...`);
    }
  } catch (error) {
    console.error('Product sync error:', error);
    errors++;
  }

  const duration = Date.now() - startTime;
  return { synced, errors, duration };
}
