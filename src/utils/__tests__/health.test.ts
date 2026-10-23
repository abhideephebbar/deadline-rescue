import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import healthHandler from '../../../api/health';

declare const process: { env: Record<string, string | undefined> };

describe('GET /api/health', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('reports hasKey: false and default model when GEMINI_API_KEY is not set', async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_MODEL;

    let statusCode: number = 0;
    let jsonBody: any = null;

    const res = {
      status(code: number) {
        statusCode = code;
        return {
          json(data: any) {
            jsonBody = data;
            return data;
          },
        };
      },
    };

    const req = { method: 'GET' };
    await healthHandler(req, res);

    expect(statusCode).toBe(200);
    expect(jsonBody).toEqual({
      ok: true,
      hasKey: false,
      model: 'gemini-3.5-flash-lite',
    });
    expect((jsonBody as any).key).toBeUndefined();
    expect((jsonBody as any).apiKey).toBeUndefined();
  });

  it('reports hasKey: true and custom model when environment variables are set', async () => {
    process.env.GEMINI_API_KEY = 'super-secret-test-key-12345';
    process.env.GEMINI_MODEL = 'gemini-3.8-flash';

    let statusCode: number = 0;
    let jsonBody: any = null;

    const res = {
      status(code: number) {
        statusCode = code;
        return {
          json(data: any) {
            jsonBody = data;
            return data;
          },
        };
      },
    };

    const req = { method: 'GET' };
    await healthHandler(req, res);

    expect(statusCode).toBe(200);
    expect(jsonBody).toEqual({
      ok: true,
      hasKey: true,
      model: 'gemini-3.8-flash',
    });
    // Crucial invariant: never expose the key
    const bodyStr = JSON.stringify(jsonBody);
    expect(bodyStr).not.toContain('super-secret-test-key-12345');
    expect(bodyStr).not.toContain('secret');
  });

  it('handles Web standard Request/Response when res is not provided', async () => {
    delete process.env.GEMINI_API_KEY;
    const req = { method: 'GET' };
    const response = await healthHandler(req);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.ok).toBe(true);
    expect(data.hasKey).toBe(false);
    expect(data.model).toBe('gemini-3.5-flash-lite');
  });

  it('handles OPTIONS preflight cleanly', async () => {
    const req = { method: 'OPTIONS' };
    let statusCode: number = 0;
    const res = {
      status(code: number) {
        statusCode = code;
        return {
          end() {},
        };
      },
    };
    await healthHandler(req, res);
    expect(statusCode).toBe(200);
  });
});
