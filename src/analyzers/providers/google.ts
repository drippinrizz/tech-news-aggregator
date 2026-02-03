import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIProvider, AIMessage, AICompletionOptions } from './base';

export class GoogleProvider implements AIProvider {
  private client: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
  }

  getName(): string {
    return 'Google Gemini';
  }

  async complete(messages: AIMessage[], options: AICompletionOptions = {}): Promise<string> {
    const { maxTokens = 1024, temperature = 1 } = options;

    const model = this.client.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature,
      },
    });

    // Convert messages to Gemini format
    // Gemini uses a different structure - combine system + user messages
    const systemMessage = messages.find((m) => m.role === 'system');
    const chatMessages = messages.filter((m) => m.role !== 'system');

    // Build conversation history for Gemini
    const history = chatMessages.slice(0, -1).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const chat = model.startChat({
      history: history as any,
    });

    // Get the last user message
    const lastMessage = chatMessages[chatMessages.length - 1];
    const prompt = systemMessage
      ? `${systemMessage.content}\n\n${lastMessage.content}`
      : lastMessage.content;

    const result = await chat.sendMessage(prompt);
    const response = await result.response;

    return response.text();
  }
}
