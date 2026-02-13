// Basic recursive character text splitter implementation
function splitText(text: string, chunkSize: number = 1000, overlap: number = 100): string[] {
  if (text.length <= chunkSize) return [text];

  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    let endIndex = startIndex + chunkSize;
    
    // Find last space before chunk limit to avoid splitting words
    if (endIndex < text.length) {
      const lastSpace = text.lastIndexOf(" ", endIndex);
      if (lastSpace > startIndex) {
        endIndex = lastSpace;
      }
    }

    chunks.push(text.slice(startIndex, endIndex).trim());
    startIndex = endIndex - overlap; // Move start index back for overlap
  }

  return chunks;
}

export interface ProductDocument {
  content: string;
  metadata: {
    productId: string;
    title: string;
    price: number;
    image?: string;
    description?: string;
    collections: string[];
    tags: string[];
    available: boolean;
    metafields?: Record<string, any>; // [NEW] Metafields support
    chunkIndex?: number; // [NEW] Chunking support
    totalChunks?: number; // [NEW] Chunking support
  };
}

export function transformProductToDocument(product: any): ProductDocument[] {
  // Remove HTML tags from description
  const cleanDescription =
    product.body_html
      ?.replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim() || "";

  const productImage =
    product.image ||
    product.featuredImage?.url ||
    product.images?.[0]?.src ||
    product.images?.[0]?.url ||
    "";
  
  // Use metafields if available (passed from ingestion script)
  const metafields = product.metafields || {};
  const metafieldsText = Object.entries(metafields)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");

  // Create base context header for every chunk
  const baseHeader = `
Product: ${product.title}
Price: $${product.variants?.[0]?.price || "0"}
Categories: ${product.collections?.join(", ") || "Uncategorized"}
Tags: ${product.tags?.join(", ") || "None"}
Availability: ${product.variants?.[0]?.available ? "In Stock" : "Out of Stock"}
Vendor: ${product.vendor || "Unknown"}
product_type: ${product.product_type || "General"}
${metafieldsText ? `Specifications:\n${metafieldsText}` : ""}
`.trim();

  // Split description if it's too long
  const descriptionChunks = splitText(cleanDescription, 800, 100); // 800 chars ~ 200 tokens

  if (descriptionChunks.length === 0) {
    // Edge case: No description
    return [{
      content: baseHeader,
      metadata: {
        productId: product.id,
        title: product.title,
        price: parseFloat(product.variants?.[0]?.price || "0"),
        image: productImage,
        description: cleanDescription,
        collections: product.collections || [],
        tags: product.tags || [],
        available: product.variants?.[0]?.available ?? true,
        metafields
      }
    }];
  }

  // Map chunks to documents
  return descriptionChunks.map((chunk, index) => ({
    content: `${baseHeader}\n\nDescription (${index + 1}/${descriptionChunks.length}):\n${chunk}`,
    metadata: {
      productId: product.id,
      title: product.title,
      price: parseFloat(product.variants?.[0]?.price || "0"),
      image: productImage,
      description: cleanDescription,
      collections: product.collections || [],
      tags: product.tags || [],
      available: product.variants?.[0]?.available ?? true,
      metafields,
      chunkIndex: index,
      totalChunks: descriptionChunks.length
    },
  }));
}

export function transformProductsToDocuments(
  products: any[]
): ProductDocument[] {
  // Flatten array of arrays since transformProductToDocument now returns ProductDocument[]
  return products.flatMap(transformProductToDocument);
}
