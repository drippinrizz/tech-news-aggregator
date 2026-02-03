import OpenAI from 'openai';
import { AIProvider, AIMessage, AICompletionOptions } from './base';

export class OpenAIProvider implements AIProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  getName(): string {
    return 'OpenAI GPT-4';
  }

  async complete(messages: AIMessage[], options: AICompletionOptions = {}): Promise<string> {
    const { maxTokens = 1024, temperature = 1 } = options;

    const response = await this.client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: maxTokens,
      temperature,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    return response.choices[0]?.message?.content || '';
  }
}
