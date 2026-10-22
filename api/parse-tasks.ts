/**
 * Vercel Serverless Function: POST /api/parse-tasks
 *
 * Secure server-side endpoint that calls the Google Gemini API to parse
 * unstructured coursework text (syllabi, emails, group chats).
 *
 * Keeps GEMINI_API_KEY strictly on the server (never exposed to client browser).
 * If GEMINI_API_KEY is not configured or the API call fails, signals the client
 * to seamlessly fall back to the built-in rule-based parser.
 */

export default async function handler(req: any, res?: any) {
  // Handle CORS preflight if needed
  if (req.method === 'OPTIONS') {
    if (res?.status) {
      return res.status(200).end();
    }
    return new Response(null, { status: 200 });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    if (res?.status) {
      return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
    }
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Parse body
  let body: any = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  const text = body?.text || '';
  const nowIso = body?.now || new Date().toISOString();

  if (!text || typeof text !== 'string' || !text.trim()) {
    if (res?.status) {
      return res.status(400).json({ error: 'Text content is required in request body.' });
    }
    return new Response(JSON.stringify({ error: 'Text content is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    // Graceful signal for client to fall back to rule-based parser
    const fallbackResponse = {
      fallbackToLocal: true,
      message: 'GEMINI_API_KEY is not configured on the server. Falling back to rule-based parser.',
    };

    if (res?.status) {
      return res.status(200).json(fallbackResponse);
    }
    return new Response(JSON.stringify(fallbackResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const prompt = `You are a coursework triage assistant for college students.
Current time anchor is: ${nowIso}.

Extract all assignments, labs, exams, problem sets, quizzes, and readings from the following student text.
For each item, output:
- title: concise assignment name (e.g. "Problem Set 5", "Kernel Concurrency Lab")
- course: standard course code (e.g. "CS 350", "MATH 220", or "GENERAL" if unknown)
- dueDateTime: valid ISO-8601 date string. If cutoff time is not given, default to 23:59:00 on the due day.
- estimatedHours: realistic estimate in hours (e.g. 2.5). Use ~2.0 for problem sets, ~3.5 for labs, ~4.5 for projects/exams, ~0.75 for quizzes.
- priority: one of "urgent", "high", "medium", "low"
- category: one of "assignment", "lab", "project", "reading", "quiz", "exam"
- notes: key details or verbatim quote
- isDateAmbiguous: boolean (true if only weekday given or exact date is ambiguous)
- ambiguityReason: short explanation if ambiguous

Return strictly valid JSON in this exact structure:
{
  "tasks": [
    {
      "title": "string",
      "course": "string",
      "dueDateTime": "ISO string",
      "estimatedHours": 2.5,
      "priority": "medium",
      "category": "assignment",
      "notes": "string",
      "isDateAmbiguous": false,
      "ambiguityReason": ""
    }
  ]
}

Student Text:
"""
${text}
"""`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const apiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      }),
    });

    if (!apiRes.ok) {
      const errorText = await apiRes.text();
      console.warn('Gemini API call returned non-200:', apiRes.status, errorText);
      const fallbackPayload = {
        fallbackToLocal: true,
        message: `Gemini API returned status ${apiRes.status}. Falling back to rule-based parser.`,
      };
      if (res?.status) {
        return res.status(200).json(fallbackPayload);
      }
      return new Response(JSON.stringify(fallbackPayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await apiRes.json();
    const rawContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawContent) {
      throw new Error('Empty response from Gemini API');
    }

    const parsedJson = JSON.parse(rawContent);
    const tasks = Array.isArray(parsedJson?.tasks) ? parsedJson.tasks : [];

    const result = {
      tasks,
      source: 'gemini',
      count: tasks.length,
    };

    if (res?.status) {
      return res.status(200).json(result);
    }
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error invoking Gemini parser:', error);
    const fallbackPayload = {
      fallbackToLocal: true,
      message: `Parser encountered error: ${error?.message || 'Unknown'}. Falling back to local rule-based parser.`,
    };
    if (res?.status) {
      return res.status(200).json(fallbackPayload);
    }
    return new Response(JSON.stringify(fallbackPayload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
