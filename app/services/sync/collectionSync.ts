import { AdminApiContext } from '@shopify/shopify-app-react-router/server';
import { vectorStore } from '../vectorStore';
import { generateEmbeddings } from '../rag/embeddings';
import { v4 as uuidv4 } from 'uuid';
import { SyncResult } from './productSync';

interface Collection {
  id: string;
  title: string;
  descriptionHtml: string;
  handle: string;
}

/**
 * Strip HTML tags from a string
 */
function stripHTML(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Build searchable text content from collection data
 */
function buildCollectionContent(collection: Collection): string {
  const description = stripHTML(collection.descriptionHtml || '');

  return `
    Collection: ${collection.title}
    ${description}
    Browse products in the ${collection.title} collection.
  `.trim();
}

/**
 * Sync all collections from Shopify to the vector store
 */
export async function syncCollections(
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
          query getCollections($cursor: String) {
            collections(first: 50, after: $cursor) {
              pageInfo {
                hasNextPage
                endCursor
              }
              edges {
                node {
                  id
                  title
                  descriptionHtml
                  handle
                }
              }
            }
          }
        `,
        { variables: { cursor } }
      );

      const data = await response.json();
      const collections = data.data?.collections?.edges || [];

      if (collections.length === 0) break;

      // Build document batch
      const documents = collections.map((edge: any) => {
        const collection = edge.node as Collection;
        const content = buildCollectionContent(collection);

        return {
          content,
          shopifyId: collection.id,
          handle: collection.handle,
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
          docType: 'collection' as const,
          shopifyId: doc.shopifyId,
          handle: doc.handle,
        },
      }));

      await vectorStore.upsert(vectorDocs);
      synced += vectorDocs.length;

      // Move to next page
      hasNextPage = data.data?.collections?.pageInfo?.hasNextPage || false;
      cursor = data.data?.collections?.pageInfo?.endCursor || null;

      console.log(`✅ Synced ${synced} collections...`);
    }
  } catch (error) {
    console.error('Collection sync error:', error);
    errors++;
  }

  const duration = Date.now() - startTime;
  return { synced, errors, duration };
}
