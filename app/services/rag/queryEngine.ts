import Anthropic from '@anthropic-ai/sdk';
import { vectorStore, SearchResult } from '../vectorStore';
import { SYSTEM_PROMPT, buildContext } from './prompts';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface QueryResponse {
  response: string;
  sources: SearchResult[];
  shouldEscalate: boolean;
  escalationReason?: string;
}

/**
 * Answer a user query using RAG (Retrieval-Augmented Generation)
 * @param merchantId Merchant UUID
 * @param userQuery User's question
 * @param conversationHistory Previous messages in the conversation
 */
export async function answerQuery(
  merchantId: string,
  userQuery: string,
  conversationHistory: Message[] = []
): Promise<QueryResponse> {
  // 1. Retrieve relevant documents from vector store
  const relevantDocs = await vectorStore.search(userQuery, {
    merchantId,
    limit: 5,
    minSimilarity: 0.7,
    filters: {
      docTypes: ['product', 'policy', 'collection', 'faq'],
    },
  });

  // 2. Build context from retrieved documents
  const context = buildContext(relevantDocs);

  // 3. Prepare messages for Claude
  const systemPrompt = `${SYSTEM_PROMPT}\n\n${context}`;

  const messages: Anthropic.MessageParam[] = [
    ...conversationHistory.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    {
      role: 'user' as const,
      content: userQuery,
    },
  ];

  // 4. Call Claude API
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  });

  const responseText =
    response.content[0].type === 'text' ? response.content[0].text : '';

  // 5. Check for escalation triggers
  const { shouldEscalate, reason } = checkEscalationTriggers(
    userQuery,
    responseText,
    relevantDocs
  );

  return {
    response: responseText,
    sources: relevantDocs,
    shouldEscalate,
    escalationReason: reason,
  };
}

/**
 * Simple escalation detection based on keywords and confidence
 */
function checkEscalationTriggers(
  userQuery: string,
  botResponse: string,
  sources: SearchResult[]
): { shouldEscalate: boolean; reason: string } {
  const lowerQuery = userQuery.toLowerCase();

  // Explicit human request
  const humanRequests = [
    'talk to a human',
    'speak to someone',
    'real person',
    'human agent',
    'speak with agent',
    'talk to support',
    'contact support',
  ];

  if (humanRequests.some(phrase => lowerQuery.includes(phrase))) {
    return {
      shouldEscalate: true,
      reason: 'Customer requested human assistance',
    };
  }

  // Frustration indicators
  const frustrationWords = [
    'frustrated',
    'angry',
    'terrible',
    'awful',
    'worst',
    'unacceptable',
    'ridiculous',
    'disappointed',
  ];

  if (frustrationWords.some(word => lowerQuery.includes(word))) {
    return {
      shouldEscalate: true,
      reason: 'Customer expressing frustration',
    };
  }

  // Sensitive topics
  const sensitiveTopics = [
    'refund',
    'dispute',
    'complaint',
    'lawsuit',
    'lawyer',
    'legal',
    'better business bureau',
    'scam',
    'fraud',
  ];

  if (sensitiveTopics.some(topic => lowerQuery.includes(topic))) {
    return {
      shouldEscalate: true,
      reason: 'Sensitive topic requiring human attention',
    };
  }

  // Low confidence (no relevant documents found)
  if (sources.length === 0 || sources.every(s => s.similarity < 0.75)) {
    return {
      shouldEscalate: true,
      reason: 'Low confidence in answer - insufficient knowledge base information',
    };
  }

  return { shouldEscalate: false, reason: '' };
}
