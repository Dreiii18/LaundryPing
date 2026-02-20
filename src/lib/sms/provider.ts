export interface SendSmsResult {
  success: boolean;
  provider: string;
  messageId?: string;
  error?: string;
  rawResponse?: unknown;
}

export interface SmsProvider {
  send(to: string, message: string): Promise<SendSmsResult>;
}

// Semaphore SMS API integration
class SemaphoreProvider implements SmsProvider {
  private apiKey: string;
  private senderName: string;

  constructor() {
    this.apiKey = process.env.SEMAPHORE_API_KEY || '';
    this.senderName = process.env.SEMAPHORE_SENDER_NAME || 'LaundryPing';
  }

  async send(to: string, message: string): Promise<SendSmsResult> {
    if (!this.apiKey) {
      return { success: false, provider: 'semaphore', error: 'SEMAPHORE_API_KEY not configured' };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout per PRD

    try {
      const response = await fetch('https://semaphore.co/api/v4/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          apikey: this.apiKey,
          number: to,
          message: message,
          sendername: this.senderName,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        const errorBody = await response.text();
        return {
          success: false,
          provider: 'semaphore',
          error: `HTTP ${response.status}: ${errorBody}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        provider: 'semaphore',
        messageId: String(data[0]?.message_id || ''),
        rawResponse: data,
      };
    } catch (err) {
      clearTimeout(timeout);
      const errorMessage = err instanceof Error
        ? (err.name === 'AbortError' ? 'SMS API timeout (5s)' : err.message)
        : 'Network error';
      return { success: false, provider: 'semaphore', error: errorMessage };
    }
  }
}

// Mock provider for development
class MockProvider implements SmsProvider {
  async send(to: string, message: string): Promise<SendSmsResult> {
    console.log(`[MOCK SMS] To: ${to}`);
    console.log(`[MOCK SMS] Message: ${message}`);
    console.log(`[MOCK SMS] ---`);

    // Simulate a small delay
    await new Promise(resolve => setTimeout(resolve, 200));

    return {
      success: true,
      provider: 'mock',
      messageId: `mock-${Date.now()}`,
    };
  }
}

// Factory function - returns the right provider based on env
export function getSmsProvider(): SmsProvider {
  const providerType = process.env.SMS_PROVIDER || 'mock';
  switch (providerType) {
    case 'semaphore':
      return new SemaphoreProvider();
    case 'mock':
    default:
      return new MockProvider();
  }
}

// Convenience function used by API routes
export async function sendSms(to: string, message: string): Promise<SendSmsResult> {
  const provider = getSmsProvider();
  return provider.send(to, message);
}
