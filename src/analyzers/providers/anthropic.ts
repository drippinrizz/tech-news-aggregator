import Anthropic from '@anthropic-ai/sdk';
import { AIProvider, AIMessage, AICompletionOptions } from './base';

export class AnthropicProvider implements AIProvider {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  getName(): string {
    return 'Anthropic Claude';
  }

  async complete(messages: AIMessage[], options: AICompletionOptions = {}): Promise<string> {
    const { maxTokens = 1024, temperature = 1 } = options;

    // Anthropic uses system message separately
    const systemMessage = messages.find((m) => m.role === 'system');
    const chatMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      temperature,
      system: systemMessage?.content,
      messages: chatMessages,
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    return textBlock?.type === 'text' ? textBlock.text : '';
  }
}
