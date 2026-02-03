/**
 * Base AI Provider Interface
 * All AI providers must implement this interface
 */

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AICompletionOptions {
  maxTokens?: number;
  temperature?: number;
}

export interface AIProvider {
  /**
   * Send a message and get a completion
   */
  complete(messages: AIMessage[], options?: AICompletionOptions): Promise<string>;

  /**
   * Get the provider name for logging
   */
  getName(): string;
}

export type AIProviderType = 'anthropic' | 'openai' | 'google';

/**
 * Factory function to create the appropriate AI provider
 */
export function createAIProvider(type: AIProviderType, apiKey: string): AIProvider {
  switch (type) {
    case 'anthropic':
      // Dynamic import to avoid loading unused SDKs
      const { AnthropicProvider } = require('./anthropic');
      return new AnthropicProvider(apiKey);
    case 'openai':
      const { OpenAIProvider } = require('./openai');
      return new OpenAIProvider(apiKey);
    case 'google':
      const { GoogleProvider } = require('./google');
      return new GoogleProvider(apiKey);
    default:
      throw new Error(`Unknown AI provider: ${type}`);
  }
}

/**
 * Get the provider type from environment or default
 */
export function getProviderType(): AIProviderType {
  const provider = process.env.AI_PROVIDER?.toLowerCase() as AIProviderType;
  if (provider && ['anthropic', 'openai', 'google'].includes(provider)) {
    return provider;
  }
  return 'anthropic'; // Default
}

/**
 * Get the API key for the current provider
 */
export function getProviderApiKey(type?: AIProviderType): string {
  const providerType = type || getProviderType();

  switch (providerType) {
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY || '';
    case 'openai':
      return process.env.OPENAI_API_KEY || '';
    case 'google':
      return process.env.GOOGLE_AI_API_KEY || '';
    default:
      return '';
  }
}
