'use client';

import { useState } from 'react';

interface WarningBannerProps {
  warnings: string[];
}

const WARNING_MESSAGES: Record<string, { title: string; description: string }> = {
  // Server-side warnings (from AI validation)
  INPUT_NOT_DEPOSITION: {
    title: 'Input may not be deposition testimony',
    description: 'One or both transcripts do not appear to be in deposition Q&A format. Results may be unreliable.',
  },
  DIFFERENT_WITNESSES: {
    title: 'Transcripts may be from different witnesses',
    description: 'The two transcripts appear to be from different people. Contradictions between different witnesses are not meaningful.',
  },
  DIFFERENT_CASES: {
    title: 'Transcripts may discuss unrelated events',
    description: 'The transcripts appear to cover different cases or events. Comparisons may not be valid.',
  },
  // Post-analysis signal
  LOW_OVERLAP: {
    title: 'Low overlap between transcripts',
    description: 'Most comparisons were consistent — these transcripts may not discuss the same events in detail.',
  },
  // Client-side warnings
  IDENTICAL_TRANSCRIPTS: {
    title: 'Both transcripts appear identical',
    description: 'The two transcripts have the same content. Contradiction analysis requires two different depositions.',
  },
  NO_QA_FORMAT: {
    title: 'No Q&A format detected',
    description: 'Neither transcript contains Q:/A: patterns. Results may be unreliable — deposition transcripts typically follow a question-answer format.',
  },
};

export function WarningBanner({ warnings }: WarningBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || warnings.length === 0) return null;

  return (
    <div
      className="mb-6 rounded-lg border px-4 py-3"
      style={{
        borderColor: '#fbbf24',
        background: '#fffbeb',
      }}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="mt-0.5 shrink-0"
          style={{ color: '#d97706' }}
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <div className="flex-1">
          <p
            className="text-sm font-medium mb-1"
            style={{ color: '#92400e' }}
          >
            Input validation warning
          </p>
          <ul className="space-y-2">
            {warnings.map((w) => {
              const code = w.split(':')[0];
              const msg = WARNING_MESSAGES[code];
              if (!msg) return null;
              return (
                <li key={code}>
                  <p className="text-sm font-medium" style={{ color: '#78350f' }}>
                    {msg.title}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#92400e' }}>
                    {msg.description}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 p-1 rounded hover:opacity-70 transition-opacity"
          style={{ color: '#92400e' }}
          aria-label="Dismiss warning"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
