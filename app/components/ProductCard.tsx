import {
  Card,
  BlockStack,
  InlineStack,
  Text,
  Badge,
  Button,
  Thumbnail,
} from "@shopify/polaris";
import { ImageIcon } from "@shopify/polaris-icons";

export interface ProductData {
  id: string;
  title: string;
  price: number;
  image?: string;
  available: boolean;
  tags?: string[];
  collections?: string[];
  similarity?: number;
  description?: string;
}

interface ProductCardProps {
  product: ProductData;
  onMoreLikeThis?: (productId: string) => void;
  onViewDetails?: (productId: string) => void;
  showSimilarity?: boolean;
}

export function ProductCard({
  product,
  onMoreLikeThis,
  onViewDetails,
  showSimilarity = false,
}: ProductCardProps) {
  return (
    <Card>
      <BlockStack gap="300">
        {/* Header with image and title */}
        <InlineStack gap="300" blockAlign="start">
          <Thumbnail
            source={product.image || ImageIcon}
            alt={product.title}
            size="medium"
          />
          <BlockStack gap="200">
            <Text as="h3" variant="headingSm" fontWeight="semibold">
              {product.title}
            </Text>
            <InlineStack gap="200">
              <Text as="p" variant="bodyMd" fontWeight="bold">
                ${product.price.toFixed(2)}
              </Text>
              <Badge tone={product.available ? "success" : "critical"}>
                {product.available ? "In Stock" : "Out of Stock"}
              </Badge>
            </InlineStack>
          </BlockStack>
        </InlineStack>

        {/* Tags and Collections */}
        {(product.tags || product.collections) && (
          <InlineStack gap="100" wrap>
            {product.collections?.slice(0, 2).map((collection, idx) => (
              <Badge key={`col-${idx}`} tone="info">
                {collection}
              </Badge>
            ))}
            {product.tags?.slice(0, 3).map((tag, idx) => (
              <Badge key={`tag-${idx}`}>{tag}</Badge>
            ))}
          </InlineStack>
        )}

        {/* Description preview */}
        {product.description && (
          <Text as="p" variant="bodySm" tone="subdued">
            {product.description.length > 100
              ? `${product.description.substring(0, 100)}...`
              : product.description}
          </Text>
        )}

        {/* Similarity score (debug/test mode) */}
        {showSimilarity && product.similarity !== undefined && (
          <Text as="p" variant="bodySm" tone="subdued">
            Match Score: {(product.similarity * 100).toFixed(1)}%
          </Text>
        )}

        {/* Action Buttons */}
        <InlineStack gap="200">
          {onViewDetails && (
            <Button onClick={() => onViewDetails(product.id)} variant="primary">
              View Details
            </Button>
          )}
          {onMoreLikeThis && (
            <Button onClick={() => onMoreLikeThis(product.id)}>
              More Like This
            </Button>
          )}
        </InlineStack>
      </BlockStack>
    </Card>
  );
}
