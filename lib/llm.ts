import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import { SYSTEM_PROMPT } from '@/lib/prompt';
import type { LLMResponse } from '@/types/contradiction';

export interface LLMProvider {
  name: string;
  generate(userPrompt: string): Promise<string>;
}

/**
 * Google Gemini provider
 */
class GeminiProvider implements LLMProvider {
  name = 'gemini';
  private models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
  private genAI: GoogleGenerativeAI;
  private timeout: number;

  constructor(apiKey: string, timeout = 60000) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.timeout = timeout;
  }

  async generate(userPrompt: string): Promise<string> {
    let lastError: unknown = null;

    for (const modelName of this.models) {
      try {
        const model = this.genAI.getGenerativeModel({ model: modelName });

        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('TIMEOUT')), this.timeout);
        });

        const result = await Promise.race([
          model.generateContent([
            { text: SYSTEM_PROMPT },
            { text: userPrompt },
          ]),
          timeoutPromise,
        ]);

        return result.response.text();
      } catch (error) {
        lastError = error;
        // Only continue to next model if it's a quota/rate error
        if (!this.isQuotaError(error)) {
          throw error;
        }
      }
    }

    throw lastError || new Error('All Gemini models failed');
  }

  private isQuotaError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const msg = error.message || '';
    return msg.includes('429') || msg.includes('quota') || msg.includes('rate');
  }
}

/**
 * Groq provider (free tier with Llama models)
 */
class GroqProvider implements LLMProvider {
  name = 'groq';
  private models = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
  private client: Groq;
  private timeout: number;

  constructor(apiKey: string, timeout = 60000) {
    this.client = new Groq({ apiKey });
    this.timeout = timeout;
  }

  async generate(userPrompt: string): Promise<string> {
    let lastError: unknown = null;

    for (const model of this.models) {
      try {
        console.log(`[groq] Trying model: ${model}`);
        const completion = await this.client.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0,
          max_tokens: 4096,
        });

        const content = completion.choices[0]?.message?.content || '';
        console.log(`[groq] Success with model: ${model}`);
        return content;
      } catch (error) {
        console.error(`[groq] Error with ${model}:`, error instanceof Error ? error.message : error);
        lastError = error;
        // Continue to next model on rate limit
        if (!this.isRateLimitError(error)) {
          throw error;
        }
      }
    }

    throw lastError || new Error('All Groq models failed');
  }

  private isRateLimitError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const msg = error.message || '';
    return msg.includes('429') || msg.includes('rate') || msg.includes('limit');
  }
}

/**
 * Get ordered list of configured LLM providers.
 * Priority: GOOGLE_AI_API_KEY first, GROQ_API_KEY as fallback.
 */
export function getProviders(): LLMProvider[] {
  const timeout = 60000;
  const providers: LLMProvider[] = [];

  // Primary: Google Gemini
  if (process.env.GOOGLE_AI_API_KEY) {
    console.log('[llm] Gemini provider available');
    providers.push(new GeminiProvider(process.env.GOOGLE_AI_API_KEY, timeout));
  }

  // Fallback: Groq
  if (process.env.GROQ_API_KEY) {
    console.log('[llm] Groq provider available (fallback)');
    providers.push(new GroqProvider(process.env.GROQ_API_KEY, timeout));
  }

  if (providers.length === 0) {
    console.error('[llm] No provider configured');
  }

  return providers;
}

/**
 * Parse LLM response text into structured format
 */
export function parseLLMResponse(text: string): LLMResponse {
  // Try direct JSON parse first
  try {
    const parsed = JSON.parse(text);
    if (parsed.contradictions && Array.isArray(parsed.contradictions)) {
      return parsed;
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
        return parsed;
      }
    } catch {
      // Fall through
    }
  }

  throw new Error('PARSE_ERROR');
}
