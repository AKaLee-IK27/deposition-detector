import { scoreAll } from '@/lib/scorer';
import { getProviders, parseLLMResponse } from '@/lib/llm';
import { getCacheKey, getCached, setCache } from '@/lib/cache';
import type { RawContradiction } from '@/types/contradiction';

// Request limits
const MAX_BODY_SIZE = 1024 * 1024; // 1MB
const MAX_COMBINED_CHARS = 50000; // Practical limit for LLM context

function validateAndClean(response: { contradictions: unknown[]; warnings?: unknown[] }) {
  const validCategories = new Set(['DIRECT', 'INFERENTIAL', 'FALSE_POSITIVE']);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cleaned: RawContradiction[] = (response.contradictions || [])
    .filter((c): c is Record<string, any> => c != null && typeof c === 'object')
    .filter((c) => validCategories.has(String(c.category)))
    .map((c) => ({
      quote_a: String(c.quote_a || ''),
      quote_b: String(c.quote_b || ''),
      category: c.category as RawContradiction['category'],
      explanation: String(c.explanation || ''),
      has_time_conflict: c.has_time_conflict === true,
      has_location_conflict: c.has_location_conflict === true,
      has_identity_conflict: c.has_identity_conflict === true,
      semantic_distance: Math.max(1, Math.min(5, Math.round(Number(c.semantic_distance) || 1))),
    }))
    .filter((c) => c.quote_a && c.quote_b);

  // Clean warnings: keep only known warning codes, ensure strings
  const knownWarnings = new Set([
    'INPUT_NOT_DEPOSITION',
    'DIFFERENT_WITNESSES',
    'DIFFERENT_CASES',
  ]);
  const cleanedWarnings = (response.warnings || [])
    .filter((w): w is string => typeof w === 'string')
    .filter((w) => knownWarnings.has(w.split(':')[0]));

  return { contradictions: cleaned, warnings: cleanedWarnings };
}

function isQuotaError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message || '';
  return msg.includes('429') || msg.includes('quota') || msg.includes('rate') || msg.includes('limit');
}

function sanitizeError(error: unknown): string {
  if (!(error instanceof Error)) return 'Analysis failed. Please try again.';
  const msg = error.message || '';

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

    // Check combined transcript length (practical limit for LLM context)
    const combinedLength = transcriptA.length + transcriptB.length;
    if (combinedLength > MAX_COMBINED_CHARS) {
      return Response.json(
        { error: `Transcripts too long (max ${MAX_COMBINED_CHARS.toLocaleString()} characters combined). Please shorten them and try again.` },
        { status: 413 }
      );
    }

    const trimmedA = transcriptA.trim();
    const trimmedB = transcriptB.trim();

    // Check cache first
    const cacheKey = getCacheKey(trimmedA, trimmedB);
    const cached = getCached(cacheKey);
    if (cached) {
      return Response.json({
        contradictions: cached.contradictions,
        warnings: cached.warnings,
        cached: true,
      });
    }

    // Get ordered list of LLM providers (Google first, Groq fallback)
    const providers = getProviders();
    if (providers.length === 0) {
      return Response.json(
        { error: 'Analysis service is not configured. Please set GOOGLE_AI_API_KEY or GROQ_API_KEY.' },
        { status: 500 }
      );
    }

    const userPrompt = `Analyze these two deposition transcripts from the same witness and identify all contradictions.

=== TRANSCRIPT A ===
${trimmedA}

=== TRANSCRIPT B ===
${trimmedB}`;

    // Try each provider in order, fallback on quota/rate errors
    let lastError: unknown = null;

    for (const provider of providers) {
      try {
        console.log(`[analyze] Trying provider: ${provider.name}`);
        const responseText = await provider.generate(userPrompt);
        console.log(`[analyze] Response received from ${provider.name}, length: ${responseText.length}`);
        const llmResponse = parseLLMResponse(responseText);
        const validated = validateAndClean(llmResponse);
        const scored = scoreAll(validated.contradictions);
        const sortedScored = scored.sort((a, b) => b.confidence_score - a.confidence_score);

        // Cache the result
        setCache(cacheKey, sortedScored, validated.warnings);
        console.log(`[analyze] Cached result for key: ${cacheKey}`);

        return Response.json({
          contradictions: sortedScored,
          warnings: validated.warnings,
          cached: false,
        });
      } catch (error) {
        console.error(`[analyze] Error from ${provider.name}:`, error instanceof Error ? error.message : error);
        lastError = error;

        // Only try next provider on quota/rate limit errors
        if (!isQuotaError(error)) {
          break;
        }
        console.log(`[analyze] Quota error from ${provider.name}, trying next provider...`);
      }
    }

    // All providers failed
    const message = sanitizeError(lastError);
    return Response.json({ error: message, contradictions: [] }, { status: 500 });
  } catch (error) {
    const message = sanitizeError(error);
    return Response.json({ error: message, contradictions: [] }, { status: 500 });
  }
}
