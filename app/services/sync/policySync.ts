import { AdminApiContext } from '@shopify/shopify-app-react-router/server';
import { vectorStore } from '../vectorStore';
import { generateEmbeddings } from '../rag/embeddings';
import { v4 as uuidv4 } from 'uuid';
import { SyncResult } from './productSync';

interface ShopPolicy {
  type: string;
  body: string;
}

interface Page {
  id: string;
  title: string;
  body: string;
  handle: string;
}

/**
 * Strip HTML tags from a string
 */
function stripHTML(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Sync store policies and pages from Shopify to the vector store
 */
export async function syncPolicies(
  admin: AdminApiContext,
  merchantId: string
): Promise<SyncResult> {
  const startTime = Date.now();
  let synced = 0;
  let errors = 0;

  try {
    // Fetch shop policies
    const policyResponse = await admin.graphql(
      `#graphql
        query {
          shop {
            privacyPolicy { body }
            refundPolicy { body }
            termsOfService { body }
            shippingPolicy { body }
          }
        }
      `
    );

    const policyData = await policyResponse.json();
    const shop = policyData.data?.shop;

    const policies: Array<{ type: string; body: string }> = [];

    if (shop?.privacyPolicy?.body) {
      policies.push({ type: 'Privacy Policy', body: shop.privacyPolicy.body });
    }
    if (shop?.refundPolicy?.body) {
      policies.push({ type: 'Refund Policy', body: shop.refundPolicy.body });
    }
    if (shop?.termsOfService?.body) {
      policies.push({ type: 'Terms of Service', body: shop.termsOfService.body });
    }
    if (shop?.shippingPolicy?.body) {
      policies.push({ type: 'Shipping Policy', body: shop.shippingPolicy.body });
    }

    // Fetch pages (FAQs, About, etc.)
    const pagesResponse = await admin.graphql(
      `#graphql
        query {
          pages(first: 20) {
            edges {
              node {
                id
                title
                body
                handle
              }
            }
          }
        }
      `
    );

    const pagesData = await pagesResponse.json();
    const pages = pagesData.data?.pages?.edges || [];

    // Build documents for policies
    const policyDocuments = policies.map(policy => ({
      content: `${policy.type}\n\n${stripHTML(policy.body)}`,
      type: 'policy' as const,
      title: policy.type,
    }));

    // Build documents for pages
    const pageDocuments = pages.map((edge: any) => {
      const page = edge.node as Page;
      return {
        content: `${page.title}\n\n${stripHTML(page.body)}`,
        type: 'faq' as const,
        title: page.title,
        shopifyId: page.id,
        handle: page.handle,
      };
    });

    const allDocuments = [...policyDocuments, ...pageDocuments];

    if (allDocuments.length === 0) {
      console.log('No policies or pages to sync');
      return { synced: 0, errors: 0, duration: Date.now() - startTime };
    }

    // Generate embeddings in batch
    const contents = allDocuments.map(d => d.content);
    const embeddings = await generateEmbeddings(contents);

    // Upsert to vector store
    const vectorDocs = allDocuments.map((doc, i) => ({
      id: uuidv4(),
      content: doc.content,
      embedding: embeddings[i],
      metadata: {
        merchantId,
        docType: doc.type,
        shopifyId: (doc as any).shopifyId || null,
        handle: (doc as any).handle || null,
        title: doc.title,
      },
    }));

    await vectorStore.upsert(vectorDocs);
    synced = vectorDocs.length;

    console.log(`✅ Synced ${synced} policies and pages`);
  } catch (error) {
    console.error('Policy sync error:', error);
    errors++;
  }

  const duration = Date.now() - startTime;
  return { synced, errors, duration };
}
