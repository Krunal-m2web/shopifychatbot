/**
 * Sentiment Analysis Service
 * Provides simple rule-based sentiment scoring for user messages
 */

export interface SentimentResult {
  score: number; // 0.0 (negative) to 1.0 (positive), 0.5 is neutral
  label: "positive" | "neutral" | "negative";
}

const POSITIVE_WORDS = [
  "great", "awesome", "excellent", "good", "nice", "love", "happy", "thanks", 
  "thank", "perfect", "amazing", "wonderful", "cool", "better", "best"
];

const NEGATIVE_WORDS = [
  "bad", "terrible", "awful", "hate", "unhappy", "broke", "broken", "worst", 
  "slow", "error", "failed", "fail", "wrong", "poor", "expensive", "no"
];

/**
 * Analyzes the sentiment of a given string
 */
export function analyzeSentiment(text: string): SentimentResult {
  const lowerText = text.toLowerCase();
  
  let score = 0.5; // Start with neutral
  let positiveCount = 0;
  let negativeCount = 0;

  POSITIVE_WORDS.forEach(word => {
    if (lowerText.includes(word)) positiveCount++;
  });

  NEGATIVE_WORDS.forEach(word => {
    if (lowerText.includes(word)) negativeCount++;
  });

  const total = positiveCount + negativeCount;
  
  if (total > 0) {
    // Basic calculation: (pos - neg) / total, then mapped to 0-1
    // Example: 2 pos, 0 neg -> (2-0)/2 = 1 -> (1 + 1) / 2 = 1.0
    // Example: 0 pos, 2 neg -> (0-2)/2 = -1 -> (-1 + 1) / 2 = 0.0
    const ratio = (positiveCount - negativeCount) / total;
    score = (ratio + 1) / 2;
  }

  // Adjust classification labels
  let label: "positive" | "neutral" | "negative" = "neutral";
  if (score > 0.6) label = "positive";
  else if (score < 0.4) label = "negative";

  return { score, label };
}
