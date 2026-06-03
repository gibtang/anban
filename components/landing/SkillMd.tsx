'use client';

import { useEffect, useState } from 'react';
import apiFetch from '@/lib/apiFetch';

interface Frontmatter {
  version: string;
  lastUpdated: string;
}

function parseFrontmatter(raw: string): { frontmatter: Frontmatter | null; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { frontmatter: null, body: raw };

  const meta: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) meta[key.trim()] = rest.join(':').trim().replace(/^"|"$/g, '');
  }

  return {
    frontmatter: meta.version ? { version: meta.version, lastUpdated: meta.lastUpdated ?? '' } : null,
    body: match[2],
  };
}

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export function SkillMd() {
  const [content, setContent] = useState<string | null>(null);
  const [meta, setMeta] = useState<Frontmatter | null>(null);

  useEffect(() => {
    apiFetch('/skill.md')
      .then((res) => res.ok ? res.text() : null)
      .then((text) => {
        if (!text) return;
        const { frontmatter, body } = parseFrontmatter(text);
        setMeta(frontmatter);
        setContent(body);
      })
      .catch(() => {});
  }, []);

  return (
    <section id="agent-integration" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            AI Agent Integration Guide
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Machine-readable instructions for AI agents to join boards and manage cards.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Version + download bar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
              </svg>
              <span className="font-medium text-gray-700">skill.md</span>
              {meta && (
                <span className="text-gray-400">
                  v{meta.version}{meta.lastUpdated && ` · Updated ${formatDate(meta.lastUpdated)}`}
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (!content) return;
                  navigator.clipboard.writeText(content);
                  const btn = document.getElementById('copy-btn');
                  if (btn) {
                    btn.textContent = 'Copied!';
                    setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
                  }
                }}
                id="copy-btn"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Copy
              </button>
              <a
                href="/skill.md"
                download="skill.md"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Download
              </a>
            </div>
          </div>

          {/* Content display */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
            <pre className="p-6 text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed max-h-[600px] overflow-y-auto">
              {content ?? (
                <span className="text-gray-400">Loading integration guide...</span>
              )}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
