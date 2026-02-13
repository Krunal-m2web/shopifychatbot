import { BlockStack, Text, InlineStack } from "@shopify/polaris";
import type { ProductData } from "./ProductCard";
import { ProductCard } from "./ProductCard";

interface ProductCarouselProps {
  products: ProductData[];
  title?: string;
  onMoreLikeThis?: (productId: string) => void;
  onViewDetails?: (productId: string) => void;
  showSimilarity?: boolean;
}

export function ProductCarousel({
  products,
  title,
  onMoreLikeThis,
  onViewDetails,
  showSimilarity = false,
}: ProductCarouselProps) {
  if (products.length === 0) {
    return null;
  }

  return (
    <BlockStack gap="300">
      {title && (
        <Text as="h2" variant="headingMd">
          {title}
        </Text>
      )}
      
      <div
        style={{
          display: "flex",
          gap: "16px",
          overflowX: "auto",
          paddingBottom: "8px",
        }}
      >
        {products.map((product) => (
          <div
            key={product.id}
            style={{
              minWidth: "320px",
              maxWidth: "320px",
            }}
          >
            <ProductCard
              product={product}
              onMoreLikeThis={onMoreLikeThis}
              onViewDetails={onViewDetails}
              showSimilarity={showSimilarity}
            />
          </div>
        ))}
      </div>

      {products.length === 0 && (
        <Text as="p" tone="subdued" alignment="center">
          No products found
        </Text>
      )}
    </BlockStack>
  );
}
