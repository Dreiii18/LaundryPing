export interface SendEmailResult {
  success: boolean;
  provider: string;
  messageId?: string;
  error?: string;
  rawResponse?: unknown;
}

export interface EmailPayload {
  to: { email: string; name?: string };
  subject: string;
  html: string;
}

export interface EmailProvider {
  send(payload: EmailPayload): Promise<SendEmailResult>;
}

// Resend API integration
class ResendProvider implements EmailProvider {
  private apiKey: string;
  private fromAddress: string;

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY || '';
    this.fromAddress = process.env.RESEND_FROM_ADDRESS || 'LaundryPing <noreply@laundryping.com>';
  }

  async send(payload: EmailPayload): Promise<SendEmailResult> {
    if (!this.apiKey) {
      return { success: false, provider: 'resend', error: 'RESEND_API_KEY not configured' };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          from: this.fromAddress,
          to: payload.to.name
            ? `${payload.to.name} <${payload.to.email}>`
            : payload.to.email,
          subject: payload.subject,
          html: payload.html,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        const errorBody = await response.text();
        return {
          success: false,
          provider: 'resend',
          error: `HTTP ${response.status}: ${errorBody}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        provider: 'resend',
        messageId: data.id || '',
        rawResponse: data,
      };
    } catch (err) {
      clearTimeout(timeout);
      const errorMessage = err instanceof Error
        ? (err.name === 'AbortError' ? 'Email API timeout (10s)' : err.message)
        : 'Network error';
      return { success: false, provider: 'resend', error: errorMessage };
    }
  }
}

// Mock provider for development
class MockEmailProvider implements EmailProvider {
  async send(payload: EmailPayload): Promise<SendEmailResult> {
    console.log(`[MOCK EMAIL] To: ${payload.to.email}`);
    console.log(`[MOCK EMAIL] Subject: ${payload.subject}`);
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
      return new MockEmailProvider();
  }
}

// Convenience function used by API routes
export async function sendEmail(payload: EmailPayload): Promise<SendEmailResult> {
  const provider = getEmailProvider();
  return provider.send(payload);
}
