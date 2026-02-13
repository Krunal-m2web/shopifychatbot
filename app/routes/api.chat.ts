import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { v4 as uuidv4 } from 'uuid';
import prisma from '~/db.server';
import { answerQuery } from '~/services/rag/queryEngine';
import { publishMessage } from '~/lib/ably';
import { shouldEscalate } from '~/services/handover/detection';
import { sendEscalationNotification } from '~/services/handover/notification';

// CORS headers for cross-origin requests from storefront widget
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/**
 * Handle CORS preflight requests
 */
export async function loader({ request }: LoaderFunctionArgs) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
}

/**
 * Main chat endpoint - receives messages from the widget and generates AI responses
 */
export async function action({ request }: ActionFunctionArgs) {
  try {
    const body = await request.json();
    const { merchantId, conversationId, sessionId, content, customerEmail, customerName } = body;

    if (!merchantId || !sessionId || !content) {
      return Response.json(
        { error: 'Missing required fields: merchantId, sessionId, content' },
        { status: 400, headers: corsHeaders }
      );
    }

    // 1. Find or create conversation
    let conversation = conversationId
      ? await prisma.conversation.findUnique({ where: { id: conversationId } })
      : null;

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          id: uuidv4(),
          merchantId,
          sessionId,
          status: 'active',
          customerEmail,
          customerName,
        },
      });
    }

    // 2. Save user message to database
    const userMessage = await prisma.message.create({
      data: {
        id: uuidv4(),
        conversationId: conversation.id,
        role: 'user',
        content,
      },
    });

    // 3. Publish user message via Ably for real-time updates
    await publishMessage(`conversation:${conversation.id}`, 'message', {
      id: userMessage.id,
      role: 'user',
      content,
      timestamp: Date.now(),
    });

    // 4. Show typing indicator
    await publishMessage(`conversation:${conversation.id}`, 'typing', {
      role: 'assistant',
      isTyping: true,
    });

    try {
      // 5. Load conversation history (last 10 messages)
      const messages = await prisma.message.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: 'asc' },
        take: 10,
      });

      const conversationHistory = messages.slice(0, -1).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      // 6. Generate AI response using RAG
      const aiResponse = await answerQuery(
        merchantId,
        content,
        conversationHistory
      );

      // 7. Save AI response to database
      const assistantMessage = await prisma.message.create({
        data: {
          id: uuidv4(),
          conversationId: conversation.id,
          role: 'assistant',
          content: aiResponse.response,
          metadata: {
            sources: aiResponse.sources.map(s => s.id),
            similarity: aiResponse.sources.map(s => s.similarity),
          },
        },
      });

      // 8. Hide typing indicator
      await publishMessage(`conversation:${conversation.id}`, 'typing', {
        role: 'assistant',
        isTyping: false,
      });

      // 9. Publish AI response via Ably
      await publishMessage(`conversation:${conversation.id}`, 'message', {
        id: assistantMessage.id,
        role: 'assistant',
        content: aiResponse.response,
        timestamp: Date.now(),
      });

      // 10. Check if escalation is needed
      const escalationDecision = shouldEscalate(
        content,
        aiResponse.response,
        conversationHistory,
        aiResponse.sources
      );

      if (escalationDecision.shouldEscalate) {
        // Create escalation record
        const escalation = await prisma.escalation.create({
          data: {
            id: uuidv4(),
            conversationId: conversation.id,
            merchantId,
            reason: escalationDecision.reason,
            summary: aiResponse.response.substring(0, 500),
            customerEmail: conversation.customerEmail,
            status: 'pending',
          },
        });

        // Update conversation status
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { status: 'escalated' },
        });

        // Get merchant info for notification
        const merchant = await prisma.merchant.findUnique({
          where: { id: merchantId },
        });

        if (merchant) {
          // Build transcript
          const allMessages = await prisma.message.findMany({
            where: { conversationId: conversation.id },
            orderBy: { createdAt: 'asc' },
          });

          const transcript = allMessages
            .map(m => `[${m.role.toUpperCase()}]: ${m.content}`)
            .join('\n\n');

          // Send escalation notification email
          try {
            await sendEscalationNotification({
              merchantEmail: merchant.shopDomain, // Fallback to domain if no email
              merchantName: merchant.shopName || merchant.shopDomain,
              customerEmail: conversation.customerEmail || undefined,
              customerName: conversation.customerName || undefined,
              conversationId: conversation.id,
              summary: aiResponse.response,
              transcript,
              reason: escalationDecision.reason,
              dashboardUrl: `${process.env.APP_URL}/app/conversations/${conversation.id}`,
            });
          } catch (emailError) {
            console.error('Failed to send escalation email:', emailError);
            // Don't fail the request if email fails
          }
        }

        // Log analytics event
        await prisma.analyticsEvent.create({
          data: {
            id: uuidv4(),
            merchantId,
            eventType: 'conversation_escalated',
            eventData: {
              conversationId: conversation.id,
              reason: escalationDecision.reason,
            },
          },
        });
      }

      // 11. Log analytics event for message
      await prisma.analyticsEvent.create({
        data: {
          id: uuidv4(),
          merchantId,
          eventType: 'message_sent',
          eventData: {
            conversationId: conversation.id,
            role: 'assistant',
          },
        },
      });

      return Response.json(
        {
          success: true,
          conversationId: conversation.id,
          message: assistantMessage,
          escalated: escalationDecision.shouldEscalate,
        },
        { headers: corsHeaders }
      );
    } catch (error) {
      // Hide typing indicator on error
      await publishMessage(`conversation:${conversation.id}`, 'typing', {
        role: 'assistant',
        isTyping: false,
      });

      throw error;
    }
  } catch (error) {
    console.error('Chat API error:', error);
    return Response.json(
      { error: 'Failed to process message' },
      { status: 500, headers: corsHeaders }
    );
  }
}
