import Mailgun from 'mailgun.js';
import formData from 'form-data';

const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY || '',
});

const DOMAIN = process.env.MAILGUN_DOMAIN || '';
const FROM_EMAIL = process.env.MAILGUN_FROM_EMAIL || 'support@example.com';

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  template?: string;
  variables?: Record<string, any>;
}

/**
 * Send an email using Mailgun
 * @param options Email configuration
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
    console.warn('⚠️ Mailgun not configured, skipping email send');
    return;
  }

  try {
    const messageData: any = {
      from: FROM_EMAIL,
      to: options.to,
      subject: options.subject,
    };

    if (options.template) {
      // Use Mailgun template
      messageData.template = options.template;
      messageData['h:X-Mailgun-Variables'] = JSON.stringify(
        options.variables || {}
      );
    } else {
      messageData.text = options.text;
      messageData.html = options.html;
    }

    await mg.messages.create(DOMAIN, messageData);
    console.log(`📧 Email sent to ${options.to}`);
  } catch (error) {
    console.error('Mailgun error:', error);
    throw new Error(`Failed to send email: ${(error as Error).message}`);
  }
}

/**
 * Send emails to multiple recipients
 * @param recipients Array of email addresses
 * @param options Email configuration (without 'to' field)
 */
export async function sendBatchEmail(
  recipients: string[],
  options: Omit<EmailOptions, 'to'>
): Promise<void> {
  if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
    console.warn('⚠️ Mailgun not configured, skipping batch email send');
    return;
  }

  const recipientVariables: Record<string, any> = {};
  recipients.forEach(email => {
    recipientVariables[email] = { email };
  });

  try {
    await mg.messages.create(DOMAIN, {
      from: FROM_EMAIL,
      to: recipients,
      subject: options.subject,
      text: options.text,
      html: options.html,
      'recipient-variables': JSON.stringify(recipientVariables),
    });

    console.log(`📧 Batch email sent to ${recipients.length} recipients`);
  } catch (error) {
    console.error('Mailgun batch error:', error);
    throw new Error(`Failed to send batch email: ${(error as Error).message}`);
  }
}
