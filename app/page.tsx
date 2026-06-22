'use client';

import { useState, useEffect } from 'react';
import { TranscriptInput } from '@/components/TranscriptInput';
import { ContradictionCard } from '@/components/ContradictionCard';
import { FilterBar, type SortMode } from '@/components/FilterBar';
import { ProcessingSteps } from '@/components/ProcessingSteps';
import type { ScoredContradiction } from '@/types/contradiction';

interface SampleCase {
  id: string;
  name: string;
  description: string;
  transcriptA: string;
  transcriptB: string;
}

const SAMPLE_CASES: SampleCase[] = [
  {
    id: 'night-out',
    name: 'The Night Out',
    description: 'Classic alibi — demonstrates all three contradiction types',
    transcriptA: `Q: What time did you get home on March 15th?
A: I got home around 6:30, maybe a little after.

Q: Where were you for the rest of the evening?
A: I was home all night. I didn't go anywhere.

Q: Did anyone visit you that evening?
A: No, I was completely alone. Nobody came to my apartment.

Q: What time did you go to bed?
A: I went to sleep around 10pm. I was tired.

Q: What did you have for dinner?
A: I ordered pizza from Domino's around 7pm.`,
    transcriptB: `Q: What time did you get home on March 15th?
A: I arrived at about 6:45. I remember because the news was on.

Q: Where were you for the rest of the evening?
A: I stepped out around 7 to grab something to eat, then came back.

Q: Did anyone visit you that evening?
A: Yeah, my neighbor stopped by around 8:30 to drop off some documents.

Q: What time did you go to bed?
A: I was up watching TV until midnight, then I crashed.

Q: What did you have for dinner?
A: I made pasta at home. I don't remember ordering anything.`,
  },
  {
    id: 'car-accident',
    name: 'The Car Accident',
    description: 'Traffic collision — witness describes speed, weather, and who was present',
    transcriptA: `Q: How fast were you going when the accident happened?
A: I was going about 30 miles per hour, maybe a little less.

Q: What were the road conditions like?
A: It was raining pretty hard. The roads were wet and slippery.

Q: Was anyone else in the car with you?
A: No, I was driving alone that day.

Q: When did you start braking?
A: I braked right before the impact. There was no time to react.

Q: Were you using your phone at the time?
A: No, my phone was in my pocket the whole time.`,
    transcriptB: `Q: How fast were you going when the accident happened?
A: I was going slow, maybe around 20 or 25. I always drive carefully.

Q: What were the road conditions like?
A: The roads were dry. It hadn't rained in days.

Q: Was anyone else in the car with you?
A: My daughter was in the back seat. She's 16.

Q: When did you start braking?
A: I saw the car about 50 feet ahead and started braking immediately.

Q: Were you using your phone at the time?
A: I was checking my GPS on my phone, but I wasn't talking or texting.`,
  },
  {
    id: 'business-dispute',
    name: 'The Business Dispute',
    description: 'Partnership conflict — financial decisions, meetings, and resignation timeline',
    transcriptA: `Q: Did you attend all board meetings in 2023?
A: Yes, I attended every single board meeting that year.

Q: What was the company's annual revenue?
A: We were doing about $2 million annually at that point.

Q: Who had final authority on hiring decisions?
A: I had final say on all hiring. That was part of my role as COO.

Q: When did you decide to leave the company?
A: I gave my notice in June. I had been planning to leave for months.

Q: How often did you communicate with the other partners?
A: We spoke weekly, sometimes daily. We were in constant contact.`,
    transcriptB: `Q: Did you attend all board meetings in 2023?
A: I missed a few meetings in Q3 when I was traveling, but I attended most of them.

Q: What was the company's annual revenue?
A: Our revenue was closer to $500,000. We were still growing.

Q: Who had final authority on hiring decisions?
A: The board had to approve all new hires. I could recommend candidates but didn't have unilateral authority.

Q: When did you decide to leave the company?
A: I didn't plan to leave until September. The idea came up after the Q3 results.

Q: How often did you communicate with the other partners?
A: I rarely heard from them. We'd go weeks without talking sometimes.`,
  },
];



export default function Home() {
  const [transcriptA, setTranscriptA] = useState('');
  const [transcriptB, setTranscriptB] = useState('');
  const [results, setResults] = useState<ScoredContradiction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hideFalsePositives, setHideFalsePositives] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('desc');
  const [selectedCase, setSelectedCase] = useState('');
  const [analysisKey, setAnalysisKey] = useState(0);
  const [processingKey, setProcessingKey] = useState(0);
  const [samplesOpen, setSamplesOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [lastAnalyzed, setLastAnalyzed] = useState<{ a: string; b: string } | null>(null);

  const hasTranscripts = transcriptA.trim().length > 0 && transcriptB.trim().length > 0;
  const hasResults = results.length > 0;
  const hasAnyContent = transcriptA.trim().length > 0 || transcriptB.trim().length > 0;
  const hasChanges = !lastAnalyzed || lastAnalyzed.a !== transcriptA.trim() || lastAnalyzed.b !== transcriptB.trim();

  // Cmd+Enter / Ctrl+Enter keyboard shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && hasTranscripts && !loading && hasChanges) {
        e.preventDefault();
        handleAnalyze();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasTranscripts, loading, transcriptA, transcriptB, hasChanges]);

  function handleLoadCase(caseId: string) {
    const caseData = SAMPLE_CASES.find((c) => c.id === caseId);
    if (caseData) {
      setTranscriptA(caseData.transcriptA);
      setTranscriptB(caseData.transcriptB);
      setSelectedCase(caseId);
      setResults([]);
      setError(null);
      setSamplesOpen(false);
      setLastAnalyzed(null);
    }
  }

  function handleClear() {
    setTranscriptA('');
    setTranscriptB('');
    setResults([]);
    setError(null);
    setSelectedCase('');
    setHideFalsePositives(false);
    setSamplesOpen(true);
    setLastAnalyzed(null);
  }

  function handleChangeTranscript(field: 'a' | 'b', value: string) {
    if (field === 'a') {
      setTranscriptA(value);
    } else {
      setTranscriptB(value);
    }
    if (value.trim() && !selectedCase) {
      setSamplesOpen(false);
    }
  }

  async function handleAnalyze() {
    if (!transcriptA.trim() || !transcriptB.trim()) {
      setError('Please provide both transcripts.');
      return;
    }

    setLoading(true);
    setProcessingKey((k) => k + 1);
    setError(null);
    setResults([]);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcriptA: transcriptA.trim(),
          transcriptB: transcriptB.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Analysis failed. Please try again.');
        return;
      }

      setResults(data.contradictions || []);
      setAnalysisKey((k) => k + 1);
      setLastAnalyzed({ a: transcriptA.trim(), b: transcriptB.trim() });
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyResults() {
    if (!results.length) return;

    const lines = results
      .filter((c) => !hideFalsePositives || c.category !== 'FALSE_POSITIVE')
      .map((c, i) => {
        const pct = Math.round(c.confidence_score * 100);
        return [
          `[${i + 1}] ${c.category} (${pct}% confidence)`,
          `  A: "${c.quote_a}"`,
          `  B: "${c.quote_b}"`,
          `  ${c.explanation}`,
          '',
        ].join('\n');
      });

    const text = `Deposition Contradiction Analysis\n${'='.repeat(40)}\n\n${lines.join('\n')}`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const visibleResults = (hideFalsePositives
    ? results.filter((c) => c.category !== 'FALSE_POSITIVE')
    : results
  ).sort((a, b) =>
    sortMode === 'desc'
      ? b.confidence_score - a.confidence_score
      : a.confidence_score - b.confidence_score,
  );

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      {/* Subtle top border accent */}
      <div className="h-[2px] w-full" style={{ background: 'linear-gradient(90deg, var(--accent), transparent 60%)' }} />

      <div className="mx-auto max-w-4xl px-5 py-10 sm:px-6 lg:px-8">
        {/* Skip link for keyboard users */}
        <a href="#results-section" className="sr-skip-link">
          Skip to results
        </a>

        {/* Header */}
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ background: 'var(--primary)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--background)' }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
            </div>
            <span
              className="text-[11px] font-medium tracking-widest uppercase"
              style={{ color: 'var(--accent)' }}
            >
              Legal Analysis Tool
            </span>
          </div>
          <h1
            className="text-3xl sm:text-4xl font-normal tracking-tight leading-tight"
            style={{ fontFamily: 'var(--font-serif)', color: 'var(--foreground)' }}
          >
            Deposition Contradiction<br className="hidden sm:block" /> Detector
          </h1>
          <p
            className="mt-3 text-[15px] leading-relaxed max-w-xl"
            style={{ color: 'var(--muted)' }}
          >
            Compare two transcripts from the same witness. The system identifies direct contradictions, inferential conflicts, and filters false positives.
          </p>
        </header>

        {/* Sample case selector — collapsible */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setSamplesOpen(!samplesOpen)}
            className="flex items-center gap-2 text-[11px] font-medium tracking-widest uppercase transition-colors hover:opacity-70"
            style={{ color: 'var(--muted)' }}
            aria-expanded={samplesOpen}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`transition-transform duration-200 ${samplesOpen ? 'rotate-90' : ''}`}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            Try a demo case
          </button>
          {samplesOpen && (
            <div className="mt-2 flex flex-wrap gap-2">
              {SAMPLE_CASES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleLoadCase(c.id)}
                  className="rounded-lg px-3.5 py-2 text-sm font-medium transition-all"
                  style={{
                    background: selectedCase === c.id ? 'var(--primary)' : 'var(--surface)',
                    color: selectedCase === c.id ? 'var(--background)' : 'var(--foreground)',
                    border: `1px solid ${selectedCase === c.id ? 'var(--primary)' : 'var(--border)'}`,
                  }}
                >
                  <span>{c.name}</span>
                  <span
                    className="ml-2 text-xs font-normal"
                    style={{
                      color: selectedCase === c.id ? 'rgba(255,255,255,0.7)' : 'var(--muted)',
                    }}
                  >
                    {c.description}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Input section */}
        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          <TranscriptInput
            label="Transcript A"
            sublabel="Earlier Deposition"
            value={transcriptA}
            onChange={(value) => handleChangeTranscript('a', value)}
            placeholder="Paste the first deposition transcript here..."
          />
          <TranscriptInput
            label="Transcript B"
            sublabel="Later Deposition"
            value={transcriptB}
            onChange={(value) => handleChangeTranscript('b', value)}
            placeholder="Paste the second deposition transcript here..."
          />
        </div>

        {/* Action buttons */}
        <div className="mb-10 flex items-center gap-3">
          <button
            onClick={handleAnalyze}
            disabled={loading || !hasTranscripts || !hasChanges}
            className="group relative inline-flex items-center gap-2.5 rounded-lg px-6 py-3 text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
            style={{
              background: 'var(--primary)',
              color: 'var(--background)',
            }}
            aria-label={loading ? 'Analyzing contradictions, please wait' : 'Analyze contradictions'}
          >
            {loading ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Analyzing...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                Analyze Contradictions
              </>
            )}
          </button>

          {(hasAnyContent || hasResults) && (
            <button
              onClick={handleClear}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-all hover:opacity-70 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                color: 'var(--muted)',
                border: '1px solid var(--border)',
              }}
              aria-label="Clear all inputs and results"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Clear
            </button>
          )}

          <span
            className="hidden sm:inline text-[11px]"
            style={{ color: 'var(--muted)' }}
          >
            {hasTranscripts && !loading && hasChanges ? '⌘+Enter to analyze' : ''}
          </span>
        </div>

        {/* Processing steps */}
        {loading && <ProcessingSteps key={processingKey} />}

        {/* Error */}
        {error && (
          <div
            className="mb-6 rounded-lg border px-4 py-3 text-sm flex items-start gap-3"
            style={{
              borderColor: '#fca5a5',
              background: '#fef2f2',
              color: '#991b1b',
            }}
            role="alert"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        {/* Results */}
        {hasResults && (
          <div id="results-section" role="region" aria-label="Analysis results">
            <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
              {results.length} contradictions found. {visibleResults.length} shown.
            </div>
            <FilterBar
              contradictions={results}
              hideFalsePositives={hideFalsePositives}
              onToggleFilter={() => setHideFalsePositives(!hideFalsePositives)}
              sortMode={sortMode}
              onSortChange={setSortMode}
            />

            {/* Copy results button */}
            <div className="flex justify-end py-2">
              <button
                onClick={handleCopyResults}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium tracking-wider uppercase transition-colors hover:opacity-70"
                style={{ color: 'var(--muted)' }}
                aria-label="Copy results to clipboard"
              >
                {copied ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Copied
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    Copy results
                  </>
                )}
              </button>
            </div>

            <div key={analysisKey}>
              {visibleResults.map((c, i) => (
                <div
                  key={i}
                  className="animate-fade-up"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <ContradictionCard contradiction={c} />
                </div>
              ))}
              {visibleResults.length === 0 && (
                <p
                  className="text-center text-sm py-10"
                  style={{ color: 'var(--muted)' }}
                >
                  All contradictions are hidden by the noise filter. Toggle it off to see false positives.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Empty state — onboarding */}
        {!loading && !hasResults && !error && (
          <div className="text-center py-16">
            <div
              className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--muted)' }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <p className="text-base font-medium mb-1" style={{ color: 'var(--foreground)' }}>
              Ready to analyze
            </p>
            <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
              Paste two deposition transcripts from the same witness to find contradictions.
            </p>

            {/* How it works */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-left">
              <div className="flex items-start gap-3">
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                  style={{ background: 'var(--primary)', color: 'var(--background)' }}
                >
                  1
                </span>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Paste transcripts</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Two separate depositions from the same witness</p>
                </div>
              </div>
              <div className="hidden sm:block" style={{ color: 'var(--border-strong)' }}>→</div>
              <div className="flex items-start gap-3">
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                  style={{ background: 'var(--primary)', color: 'var(--background)' }}
                >
                  2
                </span>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>AI analysis</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Identifies direct and inferential contradictions</p>
                </div>
              </div>
              <div className="hidden sm:block" style={{ color: 'var(--border-strong)' }}>→</div>
              <div className="flex items-start gap-3">
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                  style={{ background: 'var(--primary)', color: 'var(--background)' }}
                >
                  3
                </span>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Scored results</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Ranked by confidence, noise filtered out</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
