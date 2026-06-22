import { GoogleGenerativeAI } from '@google/generative-ai';
import { scoreAll } from '@/lib/scorer';
import { SYSTEM_PROMPT } from '@/lib/prompt';
import type { LLMResponse, RawContradiction } from '@/types/contradiction';

// Fallback chain: primary first, then alternatives on quota/rate errors
const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

// Request limits
const MAX_BODY_SIZE = 1024 * 1024; // 1MB
const REQUEST_TIMEOUT = 60000; // 60 seconds

function parseLLMResponse(text: string): LLMResponse {
  // Try direct JSON parse first
  try {
    const parsed = JSON.parse(text);
    if (parsed.contradictions && Array.isArray(parsed.contradictions)) {
      return validateAndClean(parsed);
    }
  } catch {
    // Fall through to regex extraction
  }

  // Fallback: try to extract JSON from markdown code blocks or surrounding text
  const jsonMatch = text.match(/\{[\s\S]*"contradictions"[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.contradictions && Array.isArray(parsed.contradictions)) {
        return validateAndClean(parsed);
      }
    } catch {
      // Fall through
    }
  }

  throw new Error('PARSE_ERROR');
}

function validateAndClean(response: LLMResponse): LLMResponse {
  const validCategories = new Set(['DIRECT', 'INFERENTIAL', 'FALSE_POSITIVE']);

  const cleaned: RawContradiction[] = response.contradictions
    .filter((c) => c && typeof c === 'object')
    .filter((c) => validCategories.has(c.category))
    .map((c) => ({
      quote_a: String(c.quote_a || ''),
      quote_b: String(c.quote_b || ''),
      category: c.category as RawContradiction['category'],
      explanation: String(c.explanation || ''),
      has_time_conflict: Boolean(c.has_time_conflict),
      has_location_conflict: Boolean(c.has_location_conflict),
      has_identity_conflict: Boolean(c.has_identity_conflict),
      semantic_distance: Math.max(1, Math.min(5, Math.round(Number(c.semantic_distance) || 1))),
    }))
    .filter((c) => c.quote_a && c.quote_b);

  return { contradictions: cleaned };
}

function isQuotaError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message || '';
  return msg.includes('429') || msg.includes('quota') || msg.includes('rate');
}

function sanitizeError(error: unknown): string {
  if (!(error instanceof Error)) return 'Analysis failed. Please try again.';
  const msg = error.message || '';

  // Map known error patterns to user-friendly messages
  if (msg.includes('PARSE_ERROR')) {
    return 'The AI response could not be parsed. Please try again.';
  }
  if (msg.includes('SAFETY')) {
    return 'The content was blocked by safety filters. Please check your transcripts.';
  }
  if (msg.includes('TIMEOUT')) {
    return 'Analysis timed out. Please try again with shorter transcripts.';
  }
  if (isQuotaError(error)) {
    return 'Analysis service is temporarily unavailable. Please try again in a minute.';
  }

  // Unknown error: return generic message, never expose raw API errors
  return 'Analysis failed. Please try again.';
}

export async function POST(request: Request) {
  try {
    // Check content length before parsing
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_BODY_SIZE) {
      return Response.json(
        { error: 'Request too large. Please shorten your transcripts.' },
        { status: 413 }
      );
    }

    const body = await request.json();
    const { transcriptA, transcriptB } = body;

    if (!transcriptA || !transcriptB) {
      return Response.json(
        { error: 'Both transcripts are required.' },
        { status: 400 }
      );
    }

    // Check combined transcript length
    const combinedLength = transcriptA.length + transcriptB.length;
    if (combinedLength > MAX_BODY_SIZE) {
      return Response.json(
        { error: 'Transcripts too long. Please shorten them and try again.' },
        { status: 413 }
      );
    }

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: 'Analysis service is not configured.' },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const userPrompt = `Analyze these two deposition transcripts from the same witness and identify all contradictions.

=== TRANSCRIPT A ===
${transcriptA}

=== TRANSCRIPT B ===
${transcriptB}`;

    // Try each model in the fallback chain
    let lastError: unknown = null;

    for (const modelName of MODELS) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        
        // Add timeout to generateContent
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('TIMEOUT')), REQUEST_TIMEOUT);
        });
        
        const result = await Promise.race([
          model.generateContent([
            { text: SYSTEM_PROMPT },
            { text: userPrompt },
          ]),
          timeoutPromise,
        ]);

        const responseText = result.response.text();
        const llmResponse = parseLLMResponse(responseText);
        const scored = scoreAll(llmResponse.contradictions);

        return Response.json({ contradictions: scored });
      } catch (error) {
        lastError = error;
        // Only continue to next model if it's a quota/rate error
        if (!isQuotaError(error)) {
          break;
        }
      }
    }

    // All models failed or non-quota error
    const message = sanitizeError(lastError);
    return Response.json({ error: message, contradictions: [] }, { status: 500 });
  } catch (error) {
    const message = sanitizeError(error);
    return Response.json({ error: message, contradictions: [] }, { status: 500 });
  }
}
