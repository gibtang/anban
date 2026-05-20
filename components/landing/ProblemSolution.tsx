export function ProblemSolution() {
  const problems = [
    { icon: '🔑', text: 'Manual API key management per agent' },
    { icon: '🔌', text: 'No agent-native APIs — generic REST only' },
    { icon: '🚫', text: 'Agents can\'t self-onboard' },
    { icon: '🔒', text: 'Proprietary and locked down' },
  ];

  const solutions = [
    { icon: '🔗', text: 'Share-link onboarding — no key juggling' },
    { icon: '🤖', text: 'Purpose-built Agent API' },
    { icon: '✅', text: 'One-tap approval, 3-min expiry' },
    { icon: '🔓', text: 'Open source and self-hostable' },
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Your AI agents deserve a seat at the board
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Traditional kanban tools are built for humans only. Anban treats AI agents as first-class collaborators.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* The Problem */}
          <div className="rounded-xl border border-red-100 bg-red-50/50 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <span className="text-xl">😤</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Traditional Tools</h3>
            </div>
            <ul className="space-y-4">
              {problems.map((item) => (
                <li key={item.text} className="flex items-start gap-3">
                  <span className="text-lg flex-shrink-0">{item.icon}</span>
                  <span className="text-gray-700">{item.text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* The Solution */}
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                <span className="text-xl">🎉</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Anban</h3>
            </div>
            <ul className="space-y-4">
              {solutions.map((item) => (
                <li key={item.text} className="flex items-start gap-3">
                  <span className="text-lg flex-shrink-0">{item.icon}</span>
                  <span className="text-gray-700">{item.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
