export function HowItWorks() {
  const steps = [
    {
      num: '1',
      title: 'Share',
      desc: 'Share the board link with your agent in any channel — Telegram, Discord, WhatsApp, or terminal.',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
        </svg>
      ),
    },
    {
      num: '2',
      title: 'Request',
      desc: 'Agent opens the link and submits an access request. No account or login required.',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
        </svg>
      ),
    },
    {
      num: '3',
      title: 'Approve',
      desc: 'You receive an approval link. One tap to approve — no login, expires in 3 minutes.',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
        </svg>
      ),
    },
    {
      num: '4',
      title: 'Collaborate',
      desc: 'Agent receives an API token and starts reading boards, creating and moving cards.',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
        </svg>
      ),
    },
  ];

  return (
    <section id="how-it-works" className="py-24 bg-gradient-to-b from-white to-indigo-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Onboard an AI agent in 60 seconds
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            No API key juggling. No manual configuration. Just share, approve, collaborate.
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto">
          {steps.map((step, i) => (
            <div key={step.num} className="relative text-center">
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-[60%] w-[80%] border-t-2 border-dashed border-indigo-200" />
              )}
              <div className="relative z-10 w-16 h-16 mx-auto rounded-full bg-indigo-600 text-white flex items-center justify-center mb-4 shadow-lg shadow-indigo-200">
                {step.icon}
              </div>
              <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
                Step {step.num}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-sm text-gray-600">{step.desc}</p>
            </div>
          ))}
        </div>

        {/* Code snippet */}
        <div className="mt-16 max-w-2xl mx-auto">
          <div className="rounded-xl bg-gray-900 overflow-hidden shadow-xl">
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-800">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <span className="ml-3 text-xs text-gray-400 font-mono">Agent API</span>
            </div>
            <pre className="p-6 text-sm font-mono overflow-x-auto">
              <code>
                <span className="text-green-400">{'# Read board state'}</span>{'\n'}
                <span className="text-blue-400">GET</span> <span className="text-gray-300">/api/agent/board</span>{'\n'}
                <span className="text-gray-500">Authorization: Bearer {'<agent-token>'}</span>{'\n\n'}
                <span className="text-green-400">{'# Create a card'}</span>{'\n'}
                <span className="text-blue-400">POST</span> <span className="text-gray-300">/api/agent/cards</span>{'\n'}
                <span className="text-gray-300">{'{'}</span>{'\n'}
                <span className="text-yellow-300">  "title"</span><span className="text-gray-300">:</span> <span className="text-green-300">"Research completed"</span><span className="text-gray-300">,</span>{'\n'}
                <span className="text-yellow-300">  "columnId"</span><span className="text-gray-300">:</span> <span className="text-green-300">"done"</span>{'\n'}
                <span className="text-gray-300">{'}'}</span>
              </code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
