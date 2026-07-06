import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Delete Your Account — Anban',
  description:
    'Request account deletion for Anban. Operated by A2ZSoft (AZ SOFT PTE. LTD.).',
  alternates: {
    canonical: '/delete-account',
  },
  openGraph: {
    title: 'Delete Your Account — Anban',
    description:
      'Request account deletion for Anban.',
    url: '/delete-account',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Anban Logo' }],
  },
};

export default function DeleteAccountPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo.svg" alt="Anban logo" className="h-7 w-auto" />
              <span className="text-xl font-bold text-gray-900">Anban</span>
            </Link>
            <div className="flex items-center gap-6">
              <Link
                href="/"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-3 py-2 -my-1 rounded-md hover:bg-gray-50"
              >
                Home
              </Link>
              <Link
                href="/login"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-3 py-2 -my-1 rounded-md hover:bg-gray-50"
              >
                Log in
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-20">
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 mb-6">
              <span className="text-xs font-medium text-indigo-700">Account Deletion</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900">
              Delete Your <span className="text-indigo-600">Account</span>
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              For the <strong>Anban</strong> web application
            </p>
          </div>

          {/* App Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-10">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Application Information
            </h2>
            <dl className="space-y-2 text-gray-700">
              <div className="flex justify-between">
                <dt className="font-medium">App Name</dt>
                <dd>Anban</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium">Package ID</dt>
                <dd className="font-mono text-sm">getanban.com</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium">Developer</dt>
                <dd>A2ZSoft (AZ SOFT PTE. LTD.)</dd>
              </div>
            </dl>
          </div>

          {/* Instructions */}
          <div className="prose prose-gray max-w-none">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              How to Delete Your Account
            </h2>
            <p className="text-gray-600 leading-relaxed">
              We respect your right to delete your account and all associated data. 
              To request account deletion for <strong>Anban</strong>:
            </p>

            <ol className="mt-6 space-y-6">
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-semibold flex items-center justify-center text-sm">
                  1
                </span>
                <div>
                  <h3 className="font-semibold text-gray-900">Send a Deletion Request</h3>
                  <p className="text-gray-600 mt-1">
                    Email us at{' '}
                    <a
                      href="mailto:admin@a2z-soft.co"
                      className="text-indigo-600 hover:underline font-medium"
                    >
                      admin@a2z-soft.co
                    </a>{' '}
                    with the subject line <strong>&quot;Account Deletion Request — Anban&quot;</strong>.
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-semibold flex items-center justify-center text-sm">
                  2
                </span>
                <div>
                  <h3 className="font-semibold text-gray-900">Include Your Account Details</h3>
                  <p className="text-gray-600 mt-1">
                    Please include the email address associated with your Anban account so we can locate it.
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-semibold flex items-center justify-center text-sm">
                  3
                </span>
                <div>
                  <h3 className="font-semibold text-gray-900">Confirmation</h3>
                  <p className="text-gray-600 mt-1">
                    We will process your request within <strong>7 business days</strong> and send you a confirmation email once your account and all associated data have been permanently deleted.
                  </p>
                </div>
              </li>
            </ol>
          </div>

          {/* What gets deleted */}
          <div className="mt-12 bg-amber-50 border border-amber-200 rounded-xl p-6">
            <h2 className="text-lg font-bold text-amber-900 mb-3">
              What Happens When You Delete Your Account
            </h2>
            <ul className="space-y-2 text-amber-900">
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
                <span>Your profile information and preferences will be permanently removed.</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
                <span>All your boards, cards, columns, and agent configurations will be permanently deleted.</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
                <span>This action is <strong>irreversible</strong> — deleted data cannot be recovered.</span>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="mt-12 text-center">
            <p className="text-gray-500 text-sm">
              Questions? Contact us at{' '}
              <a href="mailto:admin@a2z-soft.co" className="text-indigo-600 hover:underline">
                admin@a2z-soft.co
              </a>
            </p>
            <p className="text-gray-400 text-xs mt-2">
              A2ZSoft (AZ SOFT PTE. LTD.) — Developer of Anban
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-500">
              © 2026 A2Z Soft. Open source under AGPL-3.0.
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
