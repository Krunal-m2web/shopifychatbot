import { SearchResult } from '../vectorStore/types';

export interface EscalationDecision {
  shouldEscalate: boolean;
  reason: string;
  confidence: number; // 0-1
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Determine if a conversation should be escalated to a human agent
 */
export function shouldEscalate(
  userMessage: string,
  botResponse: string,
  conversationHistory: Message[],
  searchResults: SearchResult[]
): EscalationDecision {
  const lowerMessage = userMessage.toLowerCase();

  // 1. Explicit human request (highest priority)
  const humanRequests = [
    'talk to a human',
    'speak to someone',
    'real person',
    'human agent',
    'speak with agent',
    'talk to support',
    'contact support',
    'live chat',
    'representative',
    'manager',
  ];

  for (const phrase of humanRequests) {
    if (lowerMessage.includes(phrase)) {
      return {
        shouldEscalate: true,
        reason: 'Customer explicitly requested human assistance',
        confidence: 1.0,
      };
    }
  }

  // 2. Frustration or anger indicators
  const frustrationWords = [
    'frustrated',
    'angry',
    'terrible',
    'awful',
    'worst',
    'unacceptable',
    'ridiculous',
    'disappointed',
    'useless',
    'pathetic',
    'stupid',
  ];

  const frustrationCount = frustrationWords.filter(word =>
    lowerMessage.includes(word)
  ).length;

  if (frustrationCount >= 2) {
    return {
      shouldEscalate: true,
      reason: 'Customer expressing high frustration or anger',
      confidence: 0.9,
    };
  }

  // 3. Sensitive topics requiring human judgment
  const sensitiveTopics = [
    'refund',
    'dispute',
    'complaint',
    'lawsuit',
    'lawyer',
    'legal action',
    'better business bureau',
    'bbb',
    'scam',
    'fraud',
    'chargeback',
    'cancel my order',
    'damaged',
    'defective',
    'broken',
  ];

  for (const topic of sensitiveTopics) {
    if (lowerMessage.includes(topic)) {
      return {
        shouldEscalate: true,
        reason: `Sensitive topic detected: ${topic}`,
        confidence: 0.85,
      };
    }
  }

  // 4. Low confidence (insufficient knowledge)
  if (searchResults.length === 0) {
    return {
      shouldEscalate: true,
      reason: 'No relevant information found in knowledge base',
      confidence: 0.8,
    };
  }

  const avgSimilarity =
    searchResults.reduce((sum, r) => sum + r.similarity, 0) /
    searchResults.length;

  if (avgSimilarity < 0.7) {
    return {
      shouldEscalate: true,
      reason: 'Low confidence in answer (insufficient context)',
      confidence: 0.75,
    };
  }

  // 5. Conversation loop detection (bot repeating similar answers)
  if (conversationHistory.length >= 6) {
    const recentBotResponses = conversationHistory
      .filter(m => m.role === 'assistant')
      .slice(-3)
      .map(m => m.content.toLowerCase());

    // Check if bot is repeating itself
    if (recentBotResponses.length >= 3) {
      const similarResponses = recentBotResponses.filter(
        (resp, i) => i > 0 && resp.includes(recentBotResponses[i - 1].substring(0, 50))
      );

      if (similarResponses.length >= 2) {
        return {
          shouldEscalate: true,
          reason: 'Conversation loop detected - bot repeating similar answers',
          confidence: 0.7,
        };
      }
    }
  }

  // 6. User asking the same question multiple times
  if (conversationHistory.length >= 4) {
    const recentUserMessages = conversationHistory
      .filter(m => m.role === 'user')
      .slice(-2)
      .map(m => m.content.toLowerCase());

    if (recentUserMessages.length >= 2) {
      const similarity = calculateSimilarity(
        recentUserMessages[0],
        recentUserMessages[1]
      );

      if (similarity > 0.7) {
        return {
          shouldEscalate: true,
          reason: 'User repeating question - may need different approach',
          confidence: 0.65,
        };
      }
    }
  }

  // No escalation triggers detected
  return {
    shouldEscalate: false,
    reason: '',
    confidence: 0,
  };
}

/**
 * Simple string similarity calculation (Jaccard similarity)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const words1 = new Set(str1.split(/\s+/));
  const words2 = new Set(str2.split(/\s+/));

  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}
