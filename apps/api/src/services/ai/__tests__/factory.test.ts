import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createAIProvider, getAI, resetAI } from '../providers/index.js';
import { MockAIProvider } from '../providers/mock.js';
import { OpenAIProvider } from '../providers/openai.js';

describe('createAIProvider', () => {
  it('по умолчанию возвращает MockAIProvider', () => {
    const ai = createAIProvider({ provider: 'mock' });
    expect(ai).toBeInstanceOf(MockAIProvider);
  });

  it('возвращает OpenAIProvider для provider: openai', () => {
    const ai = createAIProvider({ provider: 'openai', apiKey: 'test-key' });
    expect(ai).toBeInstanceOf(OpenAIProvider);
  });

  it('возвращает OpenAIProvider для provider: groq', () => {
    const ai = createAIProvider({ provider: 'groq', apiKey: 'test-key' });
    expect(ai).toBeInstanceOf(OpenAIProvider);
  });

  it('возвращает OpenAIProvider для provider: ollama', () => {
    const ai = createAIProvider({ provider: 'ollama' });
    expect(ai).toBeInstanceOf(OpenAIProvider);
  });
});

describe('getAI singleton', () => {
  beforeEach(() => resetAI());
  afterEach(() => resetAI());

  it('возвращает один и тот же экземпляр', () => {
    const a = getAI();
    const b = getAI();
    expect(a).toBe(b);
  });

  it('после resetAI() создаёт новый экземпляр', () => {
    const a = getAI();
    resetAI();
    const b = getAI();
    expect(a).not.toBe(b);
  });
});
