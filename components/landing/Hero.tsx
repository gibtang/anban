import Link from 'next/link';

interface HeroProps {
  cloudHref: string;
}

export function Hero({ cloudHref }: HeroProps) {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16 bg-gradient-to-b from-indigo-50/60 via-white to-white overflow-hidden">
      {/* Background grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }} />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-3xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 mb-8">
            <svg className="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            <span className="text-xs font-medium text-indigo-700">Open Source — AGPL-3.0</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 leading-tight">
            Kanban Boards for{' '}
            <span className="text-indigo-600">Humans</span> and{' '}
            <span className="text-indigo-600">AI Agents</span>
          </h1>

          {/* Subheadline */}
          <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            The first project board where AI agents are first-class citizens. Share a link, approve access, and your agents can read, create, and move cards alongside your team.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={cloudHref}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
            >
              Try Cloud Version
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <a
              href="https://github.com/gibtang/anban"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              Self-Host on GitHub
            </a>
          </div>
        </div>

        {/* Kanban Mockup */}
        <div className="mt-16 max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
            {/* Mockup header */}
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <span className="ml-3 text-sm text-gray-500 font-medium">anban.app/boards/marketing</span>
            </div>
            {/* Mockup board */}
            <div className="grid grid-cols-3 gap-4 p-6">
              {/* To Do */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-gray-400" />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">To Do</span>
                  <span className="ml-auto text-xs text-gray-400">3</span>
                </div>
                <div className="space-y-2">
                  <div className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                    <p className="text-sm font-medium text-gray-800">Research competitors</p>
                    <div className="mt-2 flex items-center gap-1">
                      <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center">
                        <span className="text-[10px]">👤</span>
                      </div>
                      <span className="text-xs text-gray-400">You</span>
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                    <p className="text-sm font-medium text-gray-800">Write blog post</p>
                    <div className="mt-2 flex items-center gap-1">
                      <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                        <span className="text-[10px]">🤖</span>
                      </div>
                      <span className="text-xs text-gray-400">Agent</span>
                    </div>
                  </div>
                </div>
              </div>
              {/* In Progress */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">In Progress</span>
                  <span className="ml-auto text-xs text-gray-400">2</span>
                </div>
                <div className="space-y-2">
                  <div className="p-3 bg-white rounded-lg border border-indigo-200 shadow-sm ring-1 ring-indigo-100">
                    <p className="text-sm font-medium text-gray-800">Build API integration</p>
                    <div className="mt-2 flex items-center gap-1">
                      <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                        <span className="text-[10px]">🤖</span>
                      </div>
                      <span className="text-xs text-green-600 font-medium">OpenClaw Agent</span>
                    </div>
                    <div className="mt-2 w-full bg-indigo-100 rounded-full h-1.5">
                      <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: '60%' }} />
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                    <p className="text-sm font-medium text-gray-800">Design landing page</p>
                    <div className="mt-2 flex items-center gap-1">
                      <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center">
                        <span className="text-[10px]">👤</span>
                      </div>
                      <span className="text-xs text-gray-400">You</span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Done */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Done</span>
                  <span className="ml-auto text-xs text-gray-400">2</span>
                </div>
                <div className="space-y-2">
                  <div className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm opacity-70">
                    <p className="text-sm font-medium text-gray-500 line-through">Set up project</p>
                    <div className="mt-2 flex items-center gap-1">
                      <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center">
                        <span className="text-[10px]">👤</span>
                      </div>
                      <span className="text-xs text-gray-400">You</span>
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm opacity-70">
                    <p className="text-sm font-medium text-gray-500 line-through">Analyze codebase</p>
                    <div className="mt-2 flex items-center gap-1">
                      <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                        <span className="text-[10px]">🤖</span>
                      </div>
                      <span className="text-xs text-gray-400">Hermes Agent</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
