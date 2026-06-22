'use client';

import { useState, useEffect, useRef } from 'react';

interface Step {
  label: string;
  description: string;
}

const STEPS: Step[] = [
  {
    label: 'Preparing transcripts',
    description: 'Formatting and sending to analysis engine',
  },
  {
    label: 'Analyzing contradictions',
    description: 'AI is comparing statements across both depositions',
  },
  {
    label: 'Scoring results',
    description: 'Ranking by confidence and filtering noise',
  },
];

const STEP_TIMINGS = [0, 1500, 4000];

export function ProcessingSteps() {
  const [activeStep, setActiveStep] = useState(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Start timers when component mounts (key changes force remount)
  useEffect(() => {
    // Schedule step transitions
    const timers = STEP_TIMINGS.slice(1).map((timing, index) =>
      setTimeout(() => {
        setActiveStep(index + 1);
      }, timing),
    );

    timersRef.current = timers;

    return () => {
      timers.forEach(clearTimeout);
    };
  }, []);

  // Progress percentage for screen readers
  const progressPercent = Math.round(((activeStep + 0.5) / STEPS.length) * 100);

  return (
    <div
      className="mb-10 rounded-xl p-6 sm:p-8"
      role="region"
      aria-label="Analysis progress"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        animation: 'fade-up 0.4s ease-out',
      }}
    >
      <div className="space-y-0">
        {STEPS.map((step, index) => {
          const isDone = index < activeStep;
          const isActive = index === activeStep;
          const isPending = !isDone && !isActive;

          return (
            <div key={index} className="flex gap-4">
              {/* Step indicator column */}
              <div className="flex flex-col items-center">
                {/* Circle */}
                <div
                  className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-500"
                  style={{
                    background: isDone || isActive ? 'var(--accent)' : 'var(--border)',
                    boxShadow: isActive ? '0 0 0 4px rgba(180, 121, 42, 0.15)' : 'none',
                  }}
                >
                  {/* Pending: dot */}
                  {isPending && (
                    <div
                      className="h-2 w-2 rounded-full transition-opacity duration-300"
                      style={{ background: 'var(--muted)' }}
                    />
                  )}

                  {/* Active: spinner */}
                  {isActive && (
                    <svg
                      className="h-4 w-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                      style={{ color: 'var(--background)' }}
                    >
                      <circle
                        className="opacity-30"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="3"
                      />
                      <path
                        className="opacity-90"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                  )}

                  {/* Done: checkmark */}
                  {isDone && (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        color: 'var(--background)',
                        animation: 'scale-in 0.3s ease-out',
                      }}
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>

                {/* Connecting line */}
                {index < STEPS.length - 1 && (
                  <div
                    className="w-0.5 flex-1 min-h-[32px] transition-colors duration-500"
                    style={{
                      background: isDone ? 'var(--accent)' : 'var(--border)',
                    }}
                  />
                )}
              </div>

              {/* Step content */}
              <div className="flex flex-1 items-center pb-6">
                <div>
                  <p
                    className="text-sm font-medium transition-colors duration-300"
                    style={{
                      color: isPending ? 'var(--muted)' : 'var(--foreground)',
                    }}
                  >
                    {step.label}
                  </p>
                  <p
                    className="mt-0.5 text-xs transition-colors duration-300"
                    style={{
                      color: 'var(--muted)',
                      opacity: isPending ? 0.6 : 1,
                    }}
                  >
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress bar at bottom */}
      <div
        className="mt-2 h-1 w-full overflow-hidden rounded-full"
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Analysis progress: ${progressPercent}%`}
        style={{ background: 'var(--border)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${progressPercent}%`,
            background: 'var(--accent)',
          }}
        />
      </div>

      {/* Screen reader announcement */}
      <div className="sr-only" role="status" aria-live="polite">
        {activeStep === 0 && 'Preparing transcripts...'}
        {activeStep === 1 && 'Analyzing contradictions...'}
        {activeStep === 2 && 'Scoring results...'}
      </div>
    </div>
  );
}
