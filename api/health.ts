/**
 * Vercel Serverless Function: GET /api/health
 *
 * Lightweight diagnostic endpoint that reports AI assistant availability.
 * Never returns or exposes the API key.
 */

declare const process: { env: Record<string, string | undefined> };

export interface HealthResponse {
  ok: true;
  hasKey: boolean;
  model: string;
}

export default async function handler(req: any, res?: any) {
  // Allow OPTIONS preflight
  if (req.method === 'OPTIONS') {
    if (res?.status) {
      return res.status(200).end();
    }
    return new Response(null, { status: 200 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const hasKey = Boolean(apiKey && apiKey.trim().length > 0);
  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

  const payload: HealthResponse = {
    ok: true,
    hasKey,
    model,
  };

  if (res?.status) {
    return res.status(200).json(payload);
  }

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
