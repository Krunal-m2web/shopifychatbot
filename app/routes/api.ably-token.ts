import type { LoaderFunctionArgs } from 'react-router';
import { generateAblyToken } from '~/lib/ably';

// CORS headers for cross-origin requests from storefront widget
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/**
 * Generate a scoped Ably token for the chat widget
 * GET /api/ably-token?sessionId=xxx&conversationId=yyy
 */
export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');
    const conversationId = url.searchParams.get('conversationId');

    if (!sessionId) {
      return Response.json(
        { error: 'sessionId parameter is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Generate scoped token for this session
    // Allow subscribe to conversation channels and publish typing indicators
    const capabilities: Record<string, string[]> = {};

    if (conversationId) {
      // Specific conversation
      capabilities[`conversation:${conversationId}`] = ['subscribe', 'publish'];
    } else {
      // Wildcard for all conversations (widget can subscribe to any conversation it's part of)
      capabilities['conversation:*'] = ['subscribe'];
    }

    const tokenRequest = await generateAblyToken(sessionId, capabilities);

    return Response.json(tokenRequest, { headers: corsHeaders });
  } catch (error) {
    console.error('Ably token generation error:', error);
    return Response.json(
      { error: 'Failed to generate token' },
      { status: 500, headers: corsHeaders }
    );
  }
}
