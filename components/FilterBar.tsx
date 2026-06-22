'use client';

import type { ScoredContradiction } from '@/types/contradiction';
import { Tooltip } from '@/components/Tooltip';

export type SortMode = 'desc' | 'asc';

interface FilterBarProps {
  contradictions: ScoredContradiction[];
  hideFalsePositives: boolean;
  onToggleFilter: () => void;
  sortMode: SortMode;
  onSortChange: (mode: SortMode) => void;
}

export function FilterBar({ contradictions, hideFalsePositives, onToggleFilter, sortMode, onSortChange }: FilterBarProps) {
  const directCount = contradictions.filter((c) => c.category === 'DIRECT').length;
  const inferentialCount = contradictions.filter((c) => c.category === 'INFERENTIAL').length;
  const falsePositiveCount = contradictions.filter((c) => c.category === 'FALSE_POSITIVE').length;

  const visibleCount = hideFalsePositives
    ? directCount + inferentialCount
    : contradictions.length;

  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      {/* Top row: title + filter toggle */}
      <div className="flex items-center justify-between py-3">
        <div className="flex items-baseline gap-3">
          <span
            className="text-lg font-normal"
            style={{ fontFamily: 'var(--font-serif)', color: 'var(--foreground)' }}
          >
            {visibleCount} contradiction{visibleCount !== 1 ? 's' : ''} found
          </span>
          <Tooltip content="Confidence = weighted average of type, metadata, and lexical scores" />
        </div>

        <div className="flex items-center gap-3">
          {/* Sort toggle */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] tracking-wider uppercase" style={{ color: 'var(--muted)' }}>
              Sort
            </span>
            <button
              type="button"
              onClick={() => {
                onSortChange(sortMode === 'desc' ? 'asc' : 'desc');
              }}
              className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded transition-colors hover:opacity-70"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)',
              }}
              aria-label={`Sort by confidence, ${sortMode === 'desc' ? 'highest first' : 'lowest first'}`}
            >
              {sortMode === 'desc' ? (
                <>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12l7 7 7-7" />
                  </svg>
                  Highest first
                </>
              ) : (
                <>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 19V5M5 12l7-7 7 7" />
                  </svg>
                  Lowest first
                </>
              )}
            </button>
          </div>

          {falsePositiveCount > 0 && (
            <button
              type="button"
              onClick={onToggleFilter}
              aria-pressed={hideFalsePositives}
              className="text-sm underline-offset-4 hover:underline transition-colors"
              style={{
                color: hideFalsePositives ? 'var(--accent)' : 'var(--muted)',
                textDecoration: hideFalsePositives ? 'underline' : 'none',
              }}
            >
              {hideFalsePositives ? 'Showing signal' : 'Hide noise'}
            </button>
          )}
        </div>
      </div>

      {/* Category breakdown */}
      <div className="flex items-center gap-1.5 pb-3">
        {directCount > 0 && (
          <span
            className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(168, 50, 38, 0.1)', color: '#a83226' }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#a83226' }} />
            {directCount} direct
          </span>
        )}
        {inferentialCount > 0 && (
          <span
            className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(139, 90, 28, 0.1)', color: '#8b5a1c' }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#8b5a1c' }} />
            {inferentialCount} inferential
          </span>
        )}
        {falsePositiveCount > 0 && (
          <span
            className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(107, 101, 96, 0.1)', color: 'var(--muted)' }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--muted)' }} />
            {falsePositiveCount} noise
          </span>
        )}
      </div>
    </div>
  );
}
