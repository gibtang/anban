import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy — Anban',
  description:
    'Privacy policy for Anban, the open-source kanban board for humans and AI agents. Learn how we collect, use, and protect your data.',
  alternates: {
    canonical: '/privacy',
  },
  openGraph: {
    title: 'Privacy Policy — Anban',
    description:
      'Privacy policy for Anban, the open-source kanban board.',
    url: '/privacy',
  },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="Anban logo" className="h-8 w-8 rounded-full object-cover" />
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
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 mb-6">
              <span className="text-xs font-medium text-indigo-700">Privacy Policy</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900">
              Privacy <span className="text-indigo-600">Policy</span>
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              For the <strong>Anban</strong> web application
            </p>
          </div>

          {/* App Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-10">
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
              <div className="flex justify-between">
                <dt className="font-medium">Effective Date</dt>
                <dd>June 1, 2026</dd>
              </div>
            </dl>
          </div>

          {/* Policy Content */}
          <div className="space-y-10 text-gray-600 leading-relaxed">
            {/* Introduction */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction</h2>
              <p>
                A2ZSoft (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), operating as{' '}
                <strong>AZ SOFT PTE. LTD.</strong>, built the <strong>Anban</strong> application as
                an open-source kanban board for humans and AI agents. This privacy policy explains how we handle your data when you use our
                app.
              </p>
            </div>

            {/* Data Collection */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Information We Collect</h2>
              <p className="mb-4">
                Anban is designed with privacy in mind. We collect minimal data:
              </p>
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">Data Type</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">Collected</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">Purpose</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="px-4 py-3">Board and card data</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">Minimal</span>
                      </td>
                      <td className="px-4 py-3">To provide kanban board functionality</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">Authentication data (Firebase)</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">Minimal</span>
                      </td>
                      <td className="px-4 py-3">Secure account access</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">Usage analytics</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">Minimal</span>
                      </td>
                      <td className="px-4 py-3">Feature improvement</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">Personal identity (name, email)</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">No</span>
                      </td>
                      <td className="px-4 py-3">—</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">Financial data (card numbers)</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">No</span>
                      </td>
                      <td className="px-4 py-3">—</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">Location data</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">No</span>
                      </td>
                      <td className="px-4 py-3">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* How We Use Data */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. How We Use Your Data</h2>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  <span>Provide kanban board and agent management features</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  <span>Monitor app performance and fix crashes</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  <span>Analyze aggregate usage patterns to improve the app</span>
                </li>
              </ul>
              <p className="mt-4">
                We do <strong>not</strong> use your data for advertising, sell it to third parties, or use it for any purpose beyond what is described above.
              </p>
            </div>

            {/* Data Sharing */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Data Sharing</h2>
              <p>
                We do not share your personal data with third parties. We may use third-party
                services for analytics (e.g., Google Analytics for Firebase) which collect
                anonymized usage data. These services have their own privacy policies governing
                data handling.
              </p>
            </div>

            {/* Data Retention */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Data Retention</h2>
              <p>
                We retain usage analytics data for up to <strong>14 months</strong>. Crash reports
                are retained for <strong>90 days</strong>. You may request deletion of any data at
                any time by contacting us.
              </p>
            </div>

            {/* Your Rights */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Your Rights</h2>
              <p className="mb-4">You have the right to:</p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  <span><strong>Access</strong> — Request a copy of any data we hold about you</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  <span><strong>Deletion</strong> — Request that we delete all your data</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  <span><strong>Objection</strong> — Object to processing of your data</span>
                </li>
              </ul>
              <p className="mt-4">
                To exercise any of these rights, contact us at{' '}
                <a href="mailto:admin@a2z-soft.co" className="text-indigo-600 hover:underline font-medium">
                  admin@a2z-soft.co
                </a>.
              </p>
            </div>

            {/* Children's Privacy */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Children&apos;s Privacy</h2>
              <p>
                Anban does not knowingly collect personal information from children under
                13. If you believe a child has provided us with personal data, please contact us
                and we will take steps to remove it.
              </p>
            </div>

            {/* Security */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Security</h2>
              <p>
                We implement reasonable security measures to protect your data. However, no
                method of electronic transmission or storage is 100% secure, and we cannot
                guarantee absolute security.
              </p>
            </div>

            {/* Changes */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Changes to This Policy</h2>
              <p>
                We may update this privacy policy from time to time. We will notify you of any
                material changes by updating the &quot;Effective Date&quot; above and, where required,
                through in-app notifications.
              </p>
            </div>

            {/* Contact */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Contact Us</h2>
              <p>
                If you have questions about this privacy policy or your data, please contact:
              </p>
              <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-6">
                <p className="font-semibold text-gray-900">A2ZSoft (AZ SOFT PTE. LTD.)</p>
                <p className="text-gray-600 mt-1">Developer of Anban</p>
                <p className="text-gray-600 mt-1">
                  Email:{' '}
                  <a href="mailto:admin@a2z-soft.co" className="text-indigo-600 hover:underline">
                    admin@a2z-soft.co
                  </a>
                </p>
              </div>
            </div>
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
            <div className="flex items-center gap-6">
              <Link
                href="/delete-account"
                className="text-xs text-gray-500 hover:text-white transition-colors"
              >
                Delete Account
              </Link>
              <Link
                href="/"
                className="text-xs text-gray-500 hover:text-white transition-colors"
              >
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
