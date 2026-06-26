'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/app/contexts/AuthContext';

interface Step {
  number: number;
  title: string;
  description: string;
  guestAction: { label: string; href: string };
  userAction: { label: string; href: string };
  icon: string;
}

const steps: Step[] = [
  {
    number: 1,
    title: 'Create your first board',
    description: 'Start with a blank board or choose from templates. Boards are your workspace — organize projects, tasks, or anything that needs tracking.',
    guestAction: { label: 'Sign up to create a board', href: '/signup' },
    userAction: { label: 'Create a board', href: '/boards' },
    icon: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7',
  },
  {
    number: 2,
    title: 'Customize columns',
    description: 'Rename columns to match your workflow — To Do, In Progress, Done, or anything you want. Drag to reorder them.',
    guestAction: { label: 'Sign up to customize', href: '/signup' },
    userAction: { label: 'Open a board', href: '/boards' },
    icon: 'M4 6h16M4 10h16M4 14h16M4 18h16',
  },
  {
    number: 3,
    title: 'Add your first card',
    description: 'Cards are tasks, ideas, or items to track. Give them titles, descriptions, tags, and assign them to columns.',
    guestAction: { label: 'Sign up to add cards', href: '/signup' },
    userAction: { label: 'Create a card', href: '/boards' },
    icon: 'M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z',
  },
  {
    number: 4,
    title: 'Share with an AI agent',
    description: 'This is where Anban shines. Share your board with an AI agent (like Hermes or OpenClaw) and watch it create, update, and move cards automatically.',
    guestAction: { label: 'Sign up to connect agents', href: '/signup' },
    userAction: { label: 'Learn about agents', href: '/about' },
    icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  },
  {
    number: 5,
    title: 'Connect OpenClaw or Hermes',
    description: 'Use OpenClaw for autonomous task execution, or Hermes for multi-agent orchestration. Both integrate natively with Anban boards.',
    guestAction: { label: 'Sign up to integrate', href: '/signup' },
    userAction: { label: 'View integration guide', href: '/about' },
    icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1',
  },
  {
    number: 6,
    title: 'Set up Telegram bot',
    description: 'Get notified when agents complete tasks, or interact with your board directly from Telegram. Optional but powerful for real-time updates.',
    guestAction: { label: 'Sign up for notifications', href: '/signup' },
    userAction: { label: 'View Telegram setup', href: '/about' },
    icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  },
];

export default function GettingStartedContent() {
  const { user } = useAuth();
  const isLoggedIn = !!user;
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  useEffect(() => {
    // Check localStorage for completed steps
    const stored = localStorage.getItem('anban-onboarding-steps');
    if (stored) {
      try {
        setCompletedSteps(new Set(JSON.parse(stored)));
      } catch {}
    }
  }, []);

  const toggleStep = (stepNumber: number) => {
    const next = new Set(completedSteps);
    if (next.has(stepNumber)) {
      next.delete(stepNumber);
    } else {
      next.add(stepNumber);
    }
    setCompletedSteps(next);
    localStorage.setItem('anban-onboarding-steps', JSON.stringify([...next]));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="Anban" className="h-8 w-8 rounded-full" />
              <span className="text-xl font-bold text-gray-900">Anban</span>
            </Link>
            {isLoggedIn ? (
              <Link
                href="/boards"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
              >
                Go to Boards →
              </Link>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Sign up free
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8 text-center">
        <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
          {isLoggedIn ? 'Welcome to Anban!' : 'See how Anban works'}
        </h1>
        <p className="mt-3 text-lg text-gray-500 max-w-2xl mx-auto">
          {isLoggedIn
            ? 'Follow these steps to get the most out of your AI-powered kanban board.'
            : 'An AI-powered kanban board where agents work alongside you. Here\'s how to get started.'}
        </p>
        {!isLoggedIn && (
          <div className="mt-8">
            <Link
              href="/signup"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Get started free
            </Link>
          </div>
        )}
      </div>

      {/* Steps */}
      <div className="max-w-3xl mx-auto px-4 pb-16 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {steps.map((step) => {
            const isCompleted = completedSteps.has(step.number);
            return (
              <div
                key={step.number}
                className={`relative flex gap-6 p-6 rounded-xl border transition-all ${
                  isCompleted
                    ? 'bg-green-50 border-green-200'
                    : 'bg-white border-gray-200 hover:border-indigo-300 hover:shadow-md'
                }`}
              >
                {/* Step number */}
                <div className="flex-shrink-0">
                  <button
                    onClick={() => isLoggedIn && toggleStep(step.number)}
                    className={`flex items-center justify-center w-12 h-12 rounded-full text-lg font-bold transition-colors ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : 'bg-indigo-100 text-indigo-700'
                    } ${isLoggedIn ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                  >
                    {isCompleted ? (
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      step.number
                    )}
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className={`text-lg font-semibold ${isCompleted ? 'text-green-800' : 'text-gray-900'}`}>
                        {step.title}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">{step.description}</p>
                    </div>
                    <svg
                      className={`w-6 h-6 flex-shrink-0 ${isCompleted ? 'text-green-400' : 'text-gray-300'}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={step.icon} />
                    </svg>
                  </div>

                  <div className="mt-4">
                    <Link
                      href={isLoggedIn ? step.userAction.href : step.guestAction.href}
                      className={`inline-flex items-center text-sm font-medium ${
                        isCompleted
                          ? 'text-green-700 hover:text-green-600'
                          : 'text-indigo-600 hover:text-indigo-500'
                      }`}
                    >
                      {isLoggedIn ? step.userAction.label : step.guestAction.label}
                      <svg className="ml-1 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <p className="text-gray-500">
            {isLoggedIn
              ? 'Need help? Check out the'
              : 'Ready to try it yourself?'}
          </p>
          {isLoggedIn ? (
            <Link
              href="/about"
              className="mt-2 inline-flex items-center text-indigo-600 hover:text-indigo-500 font-medium"
            >
              Anban documentation
              <svg className="ml-1 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
          ) : (
            <Link
              href="/signup"
              className="mt-4 inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Create your free account
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
