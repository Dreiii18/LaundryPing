import { Resend } from 'resend';

export interface SendEmailResult {
  success: boolean;
  provider: string;
  messageId?: string;
  error?: string;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export interface EmailProvider {
  send(options: SendEmailOptions): Promise<SendEmailResult>;
}

// Resend email integration
class ResendProvider implements EmailProvider {
  private apiKey: string;
  private from: string;

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY || '';
    this.from = process.env.EMAIL_FROM || 'LaundryPing <noreply@laundryping.com>';
  }

  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    if (!this.apiKey) {
      return { success: false, provider: 'resend', error: 'RESEND_API_KEY not configured' };
    }

    try {
      const resend = new Resend(this.apiKey);
      const { data, error } = await resend.emails.send({
        from: this.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      if (error) {
        return { success: false, provider: 'resend', error: error.message };
      }

      return {
        success: true,
        provider: 'resend',
        messageId: data?.id || '',
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Email send failed';
      return { success: false, provider: 'resend', error: errorMessage };
    }
  }
}

// Mock provider for development
class MockProvider implements EmailProvider {
  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    console.log(`[MOCK EMAIL] To: ${options.to}`);
    console.log(`[MOCK EMAIL] Subject: ${options.subject}`);
    console.log(`[MOCK EMAIL] ---`);

    return {
      success: true,
      provider: 'mock',
      messageId: `mock-${Date.now()}`,
    };
  }
}

// Factory function - returns the right provider based on env
export function getEmailProvider(): EmailProvider {
  const providerType = process.env.EMAIL_PROVIDER || 'mock';
  switch (providerType) {
    case 'resend':
      return new ResendProvider();
    case 'mock':
    default:
      return new MockProvider();
  }
}

// Convenience function used by API routes
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const provider = getEmailProvider();
  return provider.send(options);
}
