'use client';

import { useState, useCallback } from 'react';
import apiFetch from '@/lib/apiFetch';

type RangeControl = {
  type: 'range';
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  unit?: string;
};

type ToggleControl = {
  type: 'toggle';
  id: string;
  label: string;
  value: boolean;
};

type SelectControl = {
  type: 'select';
  id: string;
  label: string;
  options: string[];
  value: string;
};

type Control = RangeControl | ToggleControl | SelectControl;

interface ControlValues {
  [id: string]: number | boolean | string;
}

interface PromptControlPanelProps {
  /** Initial prompt to pre-fill (e.g. from card description) */
  initialPrompt?: string;
  /** Called when user finalizes control values */
  onValuesChange?: (values: ControlValues) => void;
}

export function PromptControlPanel({ initialPrompt = '', onValuesChange }: PromptControlPanelProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [controls, setControls] = useState<Control[]>([]);
  const [values, setValues] = useState<ControlValues>({});
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState('');

  const handleExtract = useCallback(async () => {
    if (!prompt.trim() || prompt.trim().length < 5) {
      setError('Enter at least 5 characters');
      return;
    }
    setIsExtracting(true);
    setError('');
    try {
      const res = await apiFetch('/api/ai/extract-controls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to extract controls');
      }
      const data = await res.json();
      const extracted: Control[] = data.controls ?? [];
      setControls(extracted);
      const initialValues: ControlValues = {};
      for (const c of extracted) {
        initialValues[c.id] = c.value;
      }
      setValues(initialValues);
      onValuesChange?.(initialValues);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract controls');
    } finally {
      setIsExtracting(false);
    }
  }, [prompt, onValuesChange]);

  const updateValue = useCallback((id: string, value: number | boolean | string) => {
    setValues(prev => {
      const next = { ...prev, [id]: value };
      onValuesChange?.(next);
      return next;
    });
  }, [onValuesChange]);

  return (
    <div className="space-y-4">
      {/* Prompt input */}
      <div>
        <label htmlFor="prompt-input" className="block text-sm font-medium text-gray-700 mb-1">
          Search Prompt
        </label>
        <div className="flex gap-2">
          <textarea
            id="prompt-input"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            rows={2}
            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm resize-none"
            placeholder='e.g. "Mid range hotel in Tokyo within walking distance of cafes"'
          />
          <button
            type="button"
            onClick={handleExtract}
            disabled={isExtracting || prompt.trim().length < 5}
            className="flex-shrink-0 inline-flex items-center px-3 py-2 rounded-md border border-gray-300 text-gray-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium whitespace-nowrap"
            title="Extract search parameters from your prompt"
          >
            {isExtracting ? (
              <svg className="h-4 w-4 animate-spin mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            ) : (
              <svg className="h-4 w-4 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
              </svg>
            )}
            Extract
          </button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* Rendered controls */}
      {controls.length > 0 && (
        <div className="space-y-3 border border-gray-200 rounded-md p-3 bg-gray-50/50">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Extracted Parameters</p>
          {controls.map(control => {
            if (control.type === 'range') {
              const val = (values[control.id] as number) ?? control.value;
              return (
                <div key={control.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700" htmlFor={control.id}>
                      {control.label}
                    </label>
                    <span className="text-sm font-mono text-indigo-600">
                      {val}{control.unit ? ` ${control.unit}` : ''}
                    </span>
                  </div>
                  <input
                    id={control.id}
                    type="range"
                    min={control.min}
                    max={control.max}
                    step={control.step}
                    value={val}
                    onChange={e => updateValue(control.id, Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{control.min}{control.unit ? ` ${control.unit}` : ''}</span>
                    <span>{control.max}{control.unit ? ` ${control.unit}` : ''}</span>
                  </div>
                </div>
              );
            }

            if (control.type === 'toggle') {
              const val = (values[control.id] as boolean) ?? control.value;
              return (
                <div key={control.id} className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700" htmlFor={control.id}>
                    {control.label}
                  </label>
                  <button
                    id={control.id}
                    type="button"
                    role="switch"
                    aria-checked={val}
                    onClick={() => updateValue(control.id, !val)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                      val ? 'bg-indigo-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        val ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              );
            }

            if (control.type === 'select') {
              const val = (values[control.id] as string) ?? control.value;
              return (
                <div key={control.id}>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={control.id}>
                    {control.label}
                  </label>
                  <select
                    id={control.id}
                    value={val}
                    onChange={e => updateValue(control.id, e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 text-sm text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {control.options.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              );
            }

            return null;
          })}
        </div>
      )}
    </div>
  );
}
