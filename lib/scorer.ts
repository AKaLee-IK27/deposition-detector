import type { RawContradiction, ScoredContradiction, ContradictionCategory } from '@/types/contradiction';

// Hard baseline type weights
const TYPE_WEIGHTS: Record<ContradictionCategory, number> = {
  DIRECT: 1.0,
  INFERENTIAL: 0.65,
  FALSE_POSITIVE: 0.15,
};

// Only absolute grammatical noise - no semantic content
// Deliberately excludes: "in", "out", "not", "no", "was", "is", "all", "be"
// These carry legal weight in testimony (e.g., "in" vs "out" can be the contradiction)
const LEGAL_NOISE_WORDS = new Set([
  'the', 'and', 'a', 'an', 'of', 'to', 'in', 'is', 'that', 'it', 'for', 'on', 'with', 'at',
]);

/**
 * Tokenize text: lowercase, normalize punctuation to spaces, remove noise words.
 * Preserves semantically loaded words: "was", "not", "no", "out", "all", "home", etc.
 * Keeps pronouns "I", "we" (length > 1 threshold).
 */
function tokenize(text: string): Set<string> {
  const tokens = text
    .toLowerCase()
    // Convert all punctuation to spaces (prevents "home.I" → "homei")
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    // Keep tokens > 1 char (preserves "I", "we")
    .filter((t) => t.length > 1 && !LEGAL_NOISE_WORDS.has(t));
  return new Set(tokens);
}

/**
 * Jaccard similarity: |A ∩ B| / |A ∪ B|
 * Returns 0 if both sets are empty.
 */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;

  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection++;
  }

  const union = a.size + b.size - intersection;
  if (union === 0) return 0;

  return intersection / union;
}

/**
 * Compute lexical weight from Jaccard similarity of the two quotes.
 */
function computeLexicalWeight(quoteA: string, quoteB: string): number {
  const tokensA = tokenize(quoteA);
  const tokensB = tokenize(quoteB);
  return jaccardSimilarity(tokensA, tokensB);
}

/**
 * Compute metadata weight from binary conflict flags + semantic distance.
 * 
 * Semantic distance: 1-5 scale, normalized to 0.0-1.0 via (distance - 1) / 4
 * 
 * Metadata floor: For non-FALSE_POSITIVE contradictions, if no physical flags
 * are set, apply a floor of 1 effective flag count. This prevents valid
 * contradictions (e.g., "I was wide awake" vs "I was highly intoxicated")
 * from bottoming out at metadata = 0.
 */
function computeMetadataWeight(c: RawContradiction): number {
  const flagSum =
    (c.has_time_conflict ? 1 : 0) +
    (c.has_location_conflict ? 1 : 0) +
    (c.has_identity_conflict ? 1 : 0);

  // Apply floor: non-FP contradictions get at least 1 effective flag
  const effectiveFlagSum = (c.category !== 'FALSE_POSITIVE' && flagSum === 0)
    ? 1
    : flagSum;

  // Normalize semantic_distance from 1-5 scale to 0.0-1.0
  const distance = Math.max(1, Math.min(5, c.semantic_distance));
  const normalizedDistance = (distance - 1) / 4;

  // Each component contributes 0.25 to the metadata weight
  return effectiveFlagSum * 0.25 + normalizedDistance * 0.25;
}

/**
 * Score a single contradiction using the hybrid weighted formula:
 *   Score = (Type × 0.4) + (Metadata × 0.4) + (Lexical × 0.2)
 *
 * Same inputs always produce the exact same score.
 */
export function scoreContradiction(raw: RawContradiction): ScoredContradiction {
  const typeWeight = TYPE_WEIGHTS[raw.category];
  const metadataWeight = computeMetadataWeight(raw);
  const lexicalWeight = computeLexicalWeight(raw.quote_a, raw.quote_b);

  const confidence_score =
    typeWeight * 0.4 + metadataWeight * 0.4 + lexicalWeight * 0.2;

  return {
    ...raw,
    confidence_score: Math.round(confidence_score * 100) / 100, // 2 decimal places
    type_weight: typeWeight,
    metadata_weight: Math.round(metadataWeight * 100) / 100,
    lexical_weight: Math.round(lexicalWeight * 100) / 100,
  };
}

/**
 * Score an array of raw contradictions.
 */
export function scoreAll(raw: RawContradiction[]): ScoredContradiction[] {
  return raw.map(scoreContradiction);
}
