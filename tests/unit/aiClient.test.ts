import { afterEach, describe, expect, it, vi } from 'vitest';
import { AiClient } from '../../src/background/aiClient';

describe('AiClient connection test', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('tests the configured model with a real chat completion request', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'OK' } }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new AiClient({
      apiKey: 'test-key',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      model: 'gemini-3.8-flash',
    });

    const result = await client.testConnection();

    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
    );
    const request = fetchMock.mock.calls[0][1];
    expect(request.method).toBe('POST');
    const body = JSON.parse(request.body as string);
    expect(body.model).toBe('gemini-3.8-flash');
    expect(body.max_tokens).toBe(16);
    expect(body.reasoning_effort).toBe('low');
  });

  it('shows the provider error when the configured model is unavailable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => 'Model not found',
      })
    );

    const client = new AiClient({
      apiKey: 'test-key',
      baseUrl: 'https://example.com/v1',
      model: 'retired-model',
    });

    const result = await client.testConnection();

    expect(result.success).toBe(false);
    expect(result.message).toContain('HTTP 404');
    expect(result.message).toContain('Model not found');
  });
});
