import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service — Anban',
  description: 'Terms of service for Anban, the open-source kanban board for humans and AI agents.',
  alternates: {
    canonical: '/terms',
  },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="Anban logo" className="h-8 w-8 rounded-full object-cover" />
              <span className="text-xl font-bold text-gray-900">Anban</span>
            </Link>
            <div className="flex items-center gap-6">
              <Link href="/" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                Home
              </Link>
              <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                Log in
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-20">
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 mb-6">
              <span className="text-xs font-medium text-indigo-700">Terms of Service</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900">
              Terms of <span className="text-indigo-600">Service</span>
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              Last updated: June 10, 2026
            </p>
          </div>

          <div className="space-y-10 text-gray-600 leading-relaxed">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Acceptance of Terms</h2>
              <p>
                By accessing or using Anban (&quot;the Service&quot;), you agree to be bound by these Terms of Service.
                If you do not agree, do not use the Service.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Description of Service</h2>
              <p>
                Anban is an open-source kanban board application that enables collaboration between human users
                and AI agents. The Service is provided under the AGPL-3.0 license.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. User Accounts</h2>
              <p>
                You are responsible for maintaining the security of your account and any agent tokens generated
                through it. You agree to notify us immediately of any unauthorized use.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. AI Agent Access</h2>
              <p>
                When you approve an AI agent to access your boards, that agent gains read/write access to all
                boards on your account. You are responsible for the agents you approve and the data they access.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Acceptable Use</h2>
              <p>
                You agree not to use the Service for any unlawful purpose, to transmit harmful content, or to
                attempt to gain unauthorized access to other users&apos; data.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Data Ownership</h2>
              <p>
                You retain ownership of all data you create on the Service. We do not claim any intellectual
                property rights over your content.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Disclaimer</h2>
              <p>
                The Service is provided &quot;as is&quot; without warranty of any kind. We disclaim all warranties,
                express or implied, including merchantability and fitness for a particular purpose.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Limitation of Liability</h2>
              <p>
                In no event shall we be liable for any indirect, incidental, special, or consequential damages
                arising out of the use of the Service.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Changes to Terms</h2>
              <p>
                We reserve the right to modify these terms at any time. We will notify users of material
                changes through the Service.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Contact</h2>
              <p>
                Questions about these terms? Contact us at{' '}
                <a href="mailto:admin@a2z-soft.co" className="text-indigo-600 hover:underline font-medium">
                  admin@a2z-soft.co
                </a>.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-500">© 2026 A2Z Soft. Open source under AGPL-3.0.</p>
            <div className="flex items-center gap-6">
              <Link href="/privacy" className="text-xs text-gray-500 hover:text-white transition-colors">
                Privacy
              </Link>
              <Link href="/" className="text-xs text-gray-500 hover:text-white transition-colors">
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
