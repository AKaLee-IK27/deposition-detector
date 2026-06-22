'use client';

import { useRef, useEffect } from 'react';

interface TranscriptInputProps {
  label: string;
  sublabel?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

export function TranscriptInput({ label, sublabel, value, onChange, placeholder }: TranscriptInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-expand textarea to fit content, up to max height
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get accurate scrollHeight
    textarea.style.height = 'auto';
    
    // Get computed max-height (fallback to 50vh if not set)
    const maxHeight = parseInt(getComputedStyle(textarea).maxHeight) || window.innerHeight * 0.5;
    
    // Set height to scrollHeight, capped at maxHeight
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${newHeight}px`;
  }, [value]);

  return (
    <div
      className="flex flex-col rounded-xl panel-elevated"
      style={{
        background: 'var(--surface)',
      }}
    >
      {/* Panel header */}
      <div
        className="flex items-baseline justify-between px-4 pt-3.5 pb-2"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
            {label}
          </span>
          {sublabel && (
            <span className="text-xs" style={{ color: 'var(--muted)' }}>
              {sublabel}
            </span>
          )}
        </div>
        {value && (
          <span className="text-[11px] tabular-nums" style={{ color: 'var(--muted)' }}>
            {value.length} chars
          </span>
        )}
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={6}
        className="w-full resize-none bg-transparent px-4 py-3 text-[13px] leading-relaxed placeholder:opacity-50 focus:outline-none overflow-y-auto"
        style={{
          color: 'var(--foreground)',
          fontFamily: 'var(--font-mono), monospace',
          minHeight: '150px',
          maxHeight: '50vh',
        }}
      />
    </div>
  );
}
