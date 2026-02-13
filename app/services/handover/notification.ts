import { sendEmail } from '../email/mailgun';

export interface EscalationData {
  merchantEmail: string;
  merchantName: string;
  customerEmail?: string;
  customerName?: string;
  conversationId: string;
  summary: string;
  transcript: string;
  reason: string;
  dashboardUrl: string;
}

/**
 * Send escalation notification email to merchant
 */
export async function sendEscalationNotification(
  data: EscalationData
): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header {
          background: linear-gradient(135deg, #2563EB 0%, #1E40AF 100%);
          color: white;
          padding: 30px 20px;
          border-radius: 8px 8px 0 0;
        }
        .header h1 { margin: 0; font-size: 24px; }
        .content {
          background: #f9fafb;
          padding: 30px 20px;
          border: 1px solid #e5e7eb;
          border-top: none;
        }
        .summary-box {
          background: white;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .summary-box h3 { margin-top: 0; color: #1f2937; }
        .transcript {
          background: #f3f4f6;
          padding: 20px;
          border-radius: 8px;
          font-size: 14px;
          max-height: 400px;
          overflow-y: auto;
          border-left: 4px solid #2563EB;
        }
        .btn {
          display: inline-block;
          background: #2563EB;
          color: white;
          padding: 14px 28px;
          text-decoration: none;
          border-radius: 6px;
          margin-top: 20px;
          font-weight: 600;
        }
        .btn:hover { background: #1E40AF; }
        .footer {
          text-align: center;
          padding: 20px;
          color: #6b7280;
          font-size: 13px;
        }
        .badge {
          display: inline-block;
          background: #FEE2E2;
          color: #991B1B;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎫 Customer Support Escalation</h1>
        </div>
        <div class="content">
          <p style="font-size: 16px; margin-top: 0;">Hi ${data.merchantName},</p>
          <p>A customer conversation requires your attention.</p>

          <div class="summary-box">
            <h3>📋 Customer Details</h3>
            ${data.customerEmail ? `<p><strong>Email:</strong> ${data.customerEmail}</p>` : ''}
            ${data.customerName ? `<p><strong>Name:</strong> ${data.customerName}</p>` : ''}
            <p><strong>Reason:</strong> <span class="badge">${data.reason}</span></p>
          </div>

          <div class="summary-box">
            <h3>💬 AI Summary</h3>
            <p>${data.summary}</p>
          </div>

          <h3 style="margin-top: 30px;">📝 Conversation Transcript</h3>
          <div class="transcript">
            <pre style="white-space: pre-wrap; margin: 0; font-family: 'Courier New', monospace;">${data.transcript}</pre>
          </div>

          <a href="${data.dashboardUrl}" class="btn">View in Dashboard →</a>
        </div>
        <div class="footer">
          <p>This notification was sent by your AI Support Bot</p>
          <p style="margin-top: 5px;">Conversation ID: ${data.conversationId}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Customer Support Escalation

Hi ${data.merchantName},

A customer conversation requires your attention.

Customer Information:
${data.customerEmail ? `Email: ${data.customerEmail}` : ''}
${data.customerName ? `Name: ${data.customerName}` : ''}
Reason: ${data.reason}

AI Summary:
${data.summary}

Conversation Transcript:
${data.transcript}

View in Dashboard: ${data.dashboardUrl}

Conversation ID: ${data.conversationId}
  `.trim();

  await sendEmail({
    to: data.merchantEmail,
    subject: `🎫 Support Escalation: ${data.reason}`,
    html,
    text,
  });
}

/**
 * Send daily digest email to merchant
 */
export async function sendDailyDigest(
  merchantEmail: string,
  merchantName: string,
  stats: {
    totalConversations: number;
    resolvedByAI: number;
    escalated: number;
    topTopics: string[];
  }
): Promise<void> {
  const resolutionRate =
    stats.totalConversations > 0
      ? Math.round((stats.resolvedByAI / stats.totalConversations) * 100)
      : 0;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }
        .header { background: #2563EB; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .stat-card {
          background: white;
          padding: 15px;
          margin: 10px 0;
          border-radius: 6px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .stat-value { font-size: 32px; font-weight: bold; color: #2563EB; }
        .stat-label { color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h2 style="margin: 0;">📊 Daily Support Summary</h2>
        <p style="margin: 5px 0 0 0;">${new Date().toLocaleDateString()}</p>
      </div>
      <div class="content">
        <p>Hi ${merchantName}, here's your daily summary:</p>

        <div class="stat-card">
          <div class="stat-value">${stats.totalConversations}</div>
          <div class="stat-label">Total Conversations</div>
        </div>

        <div class="stat-card">
          <div class="stat-value">${stats.resolvedByAI} <span style="font-size: 18px;">(${resolutionRate}%)</span></div>
          <div class="stat-label">Resolved by AI</div>
        </div>

        <div class="stat-card">
          <div class="stat-value">${stats.escalated}</div>
          <div class="stat-label">Escalated to Human</div>
        </div>

        ${stats.topTopics.length > 0 ? `
          <div class="stat-card">
            <div class="stat-label" style="margin-bottom: 10px;">Top Topics</div>
            <p style="margin: 0;">${stats.topTopics.join(', ')}</p>
          </div>
        ` : ''}
      </div>
    </body>
    </html>
  `;

  const text = `Daily Support Summary - ${new Date().toLocaleDateString()}

Hi ${merchantName},

Total Conversations: ${stats.totalConversations}
Resolved by AI: ${stats.resolvedByAI} (${resolutionRate}%)
Escalated: ${stats.escalated}
${stats.topTopics.length > 0 ? `Top Topics: ${stats.topTopics.join(', ')}` : ''}
  `.trim();

  await sendEmail({
    to: merchantEmail,
    subject: `📊 Daily Support Summary - ${new Date().toLocaleDateString()}`,
    html,
    text,
  });
}
