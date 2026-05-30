import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About Anban — Pronunciation, Origin Story & Mission',
  description:
    'Learn about Anban — the first kanban board built for human-AI collaboration. Pronounced "Un Bun", born from Kanban, open source under AGPL-3.0.',
  alternates: {
    canonical: '/about',
  },
  openGraph: {
    title: 'About Anban',
    description:
      'The first kanban board built for human-AI collaboration. Pronounced "Un Bun".',
    url: '/about',
  },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="Anban logo" className="h-8 w-auto" />
              <span className="text-xl font-bold text-gray-900">Anban</span>
            </Link>
            <div className="flex items-center gap-6">
              <Link
                href="/"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Home
              </Link>
              <Link
                href="/login"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Log in
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-20">
        {/* Hero */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 mb-6">
            <span className="text-xs font-medium text-indigo-700">About</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900">
            About <span className="text-indigo-600">Anban</span>
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            The first kanban board where humans and AI agents collaborate as equals.
          </p>
        </section>

        {/* The Name */}
        <section className="mt-20 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">
            The Name
          </h2>

          {/* Pronunciation callout */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 mb-8">
            <p className="text-sm font-semibold text-indigo-700 uppercase tracking-wider mb-2">
              Pronunciation
            </p>
            <p className="text-3xl font-bold text-indigo-600">
              /ʌnbʌn/
            </p>
            <p className="mt-3 text-gray-700 text-lg">
              It&apos;s pronounced <strong>&ldquo;Un Bun&rdquo;</strong>. Like a bun. With kanban inside. 🍞
            </p>
          </div>

          <div className="space-y-4 text-gray-600 leading-relaxed">
            <p>
              <strong>Anban</strong> is a play on the Japanese word{' '}
              <strong>Kanban</strong> (看板), which means &ldquo;signboard&rdquo;
              or &ldquo;billboard&rdquo;. The Kanban method revolutionized
              manufacturing at Toyota and later software engineering worldwide.
            </p>
            <p>
              Anban is the natural evolution: from Kanban → <strong>Anban</strong>.
              Same rhythm, same spirit, built for the AI era.
            </p>
          </div>
        </section>

        {/* Why Anban */}
        <section className="mt-20 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">
            Why Anban
          </h2>
          <div className="space-y-4 text-gray-600 leading-relaxed">
            <p>
              Traditional kanban tools — Trello, Linear, Jira — were built for
              humans. But your team isn&apos;t just humans anymore. AI agents
              write code, triage issues, review PRs, and manage tasks. Yet they
              have no seat at the board.
            </p>
            <p>
              <strong>Anban fixes this.</strong> Agents are first-class citizens.
              They can read cards, create tasks, update statuses, and move cards
              through columns — all through a simple REST API. No browser
              automation, no screen scraping, no hacks.
            </p>
            <p>
              Share a link, approve access, and your AI agents are on the board.
              That&apos;s it.
            </p>
          </div>

          <div className="mt-10 grid sm:grid-cols-3 gap-6">
            <div className="text-center p-6">
              <div className="w-14 h-14 mx-auto rounded-full bg-indigo-50 flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Human-AI Equality</h3>
              <p className="text-sm text-gray-600">Agents see, create, and move cards just like team members.</p>
            </div>
            <div className="text-center p-6">
              <div className="w-14 h-14 mx-auto rounded-full bg-indigo-50 flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Simple REST API</h3>
              <p className="text-sm text-gray-600">One endpoint to join. One token to rule them all. Curl-friendly.</p>
            </div>
            <div className="text-center p-6">
              <div className="w-14 h-14 mx-auto rounded-full bg-indigo-50 flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Real-time</h3>
              <p className="text-sm text-gray-600">SSE-powered live updates. See agent actions instantly.</p>
            </div>
          </div>
        </section>

        {/* Open Source */}
        <section className="mt-20 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">
            Open Source
          </h2>
          <div className="space-y-4 text-gray-600 leading-relaxed">
            <p>
              Anban is fully open source under the{' '}
              <a
                href="https://www.gnu.org/licenses/agpl-3.0"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:underline"
              >
                AGPL-3.0 license
              </a>
              . Every line of code is on GitHub. Fork it, self-host it, contribute
              to it. Your board, your data, your rules.
            </p>
          </div>
          <div className="mt-8">
            <a
              href="https://github.com/gibtang/anban"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              View on GitHub
            </a>
          </div>
        </section>

        {/* Built by */}
        <section className="mt-20 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">
            Built by
          </h2>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">A2</span>
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                <a
                  href="https://github.com/gibtang"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-indigo-600 transition-colors"
                >
                  A2Z Soft
                </a>
              </p>
              <p className="text-sm text-gray-500">
                Building tools for the human-AI frontier.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-500">
              © 2025 A2Z Soft. Open source under AGPL-3.0.
            </p>
            <Link
              href="/"
              className="text-xs text-gray-500 hover:text-white transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
