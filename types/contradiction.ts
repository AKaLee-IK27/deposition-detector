// LLM output types — no confidence scores from the LLM
export type ContradictionCategory = 'DIRECT' | 'INFERENTIAL' | 'FALSE_POSITIVE';

export interface RawContradiction {
  quote_a: string;
  quote_b: string;
  category: ContradictionCategory;
  explanation: string;
  // Binary conflict flags extracted by the LLM
  has_time_conflict: boolean;
  has_location_conflict: boolean;
  has_identity_conflict: boolean;
  // Semantic distance: 0 = same topic loosely, 1 = same event, 2 = same claim different detail, 3 = core fact inverted
  semantic_distance: number;
}

export interface LLMResponse {
  contradictions: RawContradiction[];
  warnings?: string[];
}

// Scored output types — confidence computed deterministically
export interface ScoredContradiction extends RawContradiction {
  confidence_score: number; // 0.00 to 1.00
  type_weight: number;
  metadata_weight: number;
  lexical_weight: number;
}

export interface AnalysisResult {
  contradictions: ScoredContradiction[];
  warnings?: string[];
  error?: string;
}
