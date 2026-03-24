import type { AIProvider, AIConfig, AIProviderName } from '../types.js';
import { MockAIProvider } from './mock.js';
import { OpenAIProvider } from './openai.js';

// ─── Конфигурации провайдеров ─────────────────────────────────────────────────

const PROVIDER_CONFIGS: Record<AIProviderName, Partial<AIConfig>> = {
  openai: {
    chatModel: 'gpt-4o-mini',
    whisperModel: 'whisper-1',
    // baseURL не нужен — официальный OpenAI
  },
  groq: {
    baseURL: 'https://api.groq.com/openai/v1',
    chatModel: 'llama-3.1-8b-instant',
    whisperModel: 'whisper-large-v3-turbo', // бесплатный, быстрее whisper-1
  },
  ollama: {
    baseURL: 'http://localhost:11434/v1',
    chatModel: 'llama3.2',
    apiKey: 'ollama',
  },
  mock: {},
};

// ─── Фабрика провайдеров ──────────────────────────────────────────────────────

export function createAIProvider(config?: Partial<AIConfig>): AIProvider {
  const providerName = (config?.provider ?? process.env.AI_PROVIDER ?? 'mock') as AIProviderName;

  if (providerName === 'mock') {
    return new MockAIProvider();
  }

  const baseConfig = PROVIDER_CONFIGS[providerName];
  const apiKey = config?.apiKey ?? getApiKey(providerName);

  return new OpenAIProvider({
    provider: providerName,
    apiKey,
    ...baseConfig,
    ...config,
  });
}

function getApiKey(provider: AIProviderName): string {
  const envVars: Record<AIProviderName, string> = {
    openai: process.env.OPENAI_API_KEY ?? '',
    groq: process.env.GROQ_API_KEY ?? '',
    ollama: 'ollama',
    mock: '',
  };
  return envVars[provider];
}

// ─── Singleton для использования в приложении ──────────────────────────────────

let _instance: AIProvider | null = null;

export function getAI(): AIProvider {
  if (!_instance) {
    _instance = createAIProvider();
  }
  return _instance;
}

/** Сбросить singleton (нужно в тестах) */
export function resetAI(): void {
  _instance = null;
}

export type { AIProvider } from '../types.js';
