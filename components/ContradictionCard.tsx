'use client';

import type { ScoredContradiction, ContradictionCategory } from '@/types/contradiction';
import { Tooltip } from '@/components/Tooltip';

const CATEGORY_LABEL: Record<ContradictionCategory, string> = {
  DIRECT: 'Direct Contradiction',
  INFERENTIAL: 'Inferential Conflict',
  FALSE_POSITIVE: 'False Positive',
};

const CATEGORY_COLOR: Record<ContradictionCategory, string> = {
  DIRECT: '#a83226',
  INFERENTIAL: '#8b5a1c',
  FALSE_POSITIVE: 'var(--muted)',
};

interface ContradictionCardProps {
  contradiction: ScoredContradiction;
}

export function ContradictionCard({ contradiction }: ContradictionCardProps) {
  const confidencePercent = Math.round(contradiction.confidence_score * 100);
  const categoryLabel = CATEGORY_LABEL[contradiction.category];
  const categoryColor = CATEGORY_COLOR[contradiction.category];

  return (
    <div
      className="py-5"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      {/* Category + confidence on one line */}
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-[11px] font-semibold tracking-widest uppercase"
          style={{ color: categoryColor }}
        >
          {categoryLabel}
        </span>
        <div className="flex items-center gap-2">
          {/* Confidence progress bar */}
          <div
            className="h-1.5 w-16 rounded-full overflow-hidden"
            style={{ background: 'var(--border)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${confidencePercent}%`,
                background: categoryColor,
              }}
            />
          </div>
          <span
            className="text-xs tabular-nums font-medium"
            style={{ color: 'var(--muted)' }}
          >
            {confidencePercent}%
          </span>
        </div>
      </div>

      {/* Quotes — labeled A/B with color-coded borders */}
      <div className="mb-3 space-y-2.5">
        <div
          className="flex gap-3 pl-3 py-2 rounded-r-md"
          style={{
            borderLeft: '3px solid #64748b',
            background: 'rgba(100, 116, 139, 0.04)',
          }}
        >
          <span
            className="shrink-0 mt-0.5 text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded"
            style={{
              background: '#64748b',
              color: '#fff',
            }}
          >
            A
          </span>
          <p
            className="text-[13px] leading-relaxed"
            style={{ color: 'var(--foreground)' }}
          >
            &ldquo;{contradiction.quote_a}&rdquo;
          </p>
        </div>
        <div
          className="flex gap-3 pl-3 py-2 rounded-r-md"
          style={{
            borderLeft: '3px solid #d97706',
            background: 'rgba(217, 119, 6, 0.04)',
          }}
        >
          <span
            className="shrink-0 mt-0.5 text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded"
            style={{
              background: '#d97706',
              color: '#fff',
            }}
          >
            B
          </span>
          <p
            className="text-[13px] leading-relaxed"
            style={{ color: 'var(--foreground)' }}
          >
            &ldquo;{contradiction.quote_b}&rdquo;
          </p>
        </div>
      </div>

      {/* Explanation */}
      <p className="text-[13px] leading-relaxed" style={{ color: 'var(--muted)' }}>
        {contradiction.explanation}
      </p>

      {/* Score breakdown */}
      <details className="mt-3">
        <summary
          className="cursor-pointer text-[11px] tracking-wide uppercase hover:opacity-60 transition-opacity"
          style={{ color: 'var(--muted)' }}
        >
          Score breakdown
        </summary>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs" style={{ color: 'var(--muted)' }}>
          <span>
            Type
            <Tooltip content="Category severity (40% weight)" />
            {' '}
            <span className="tabular-nums" style={{ color: 'var(--foreground)' }}>
              {contradiction.type_weight.toFixed(2)}
            </span>
          </span>
          <span>
            Metadata
            <Tooltip content="Conflicting details (40% weight)" />
            {' '}
            <span className="tabular-nums" style={{ color: 'var(--foreground)' }}>
              {contradiction.metadata_weight.toFixed(2)}
            </span>
          </span>
          <span>
            Lexical
            <Tooltip content="Word overlap (20% weight)" />
            {' '}
            <span className="tabular-nums" style={{ color: 'var(--foreground)' }}>
              {contradiction.lexical_weight.toFixed(2)}
            </span>
          </span>
        </div>
      </details>
    </div>
  );
}
