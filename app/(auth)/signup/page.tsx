import type { Metadata } from 'next';
import SignupClient from './signup-client';

export const metadata: Metadata = {
  title: 'Sign Up — Anban',
  alternates: {
    canonical: '/signup',
  },
  openGraph: {
    title: 'Sign Up — Anban',
    description: 'Create your Anban account and start collaborating with AI agents.',
    url: 'https://www.getanban.com/signup',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Anban — Kanban Boards for Humans and AI Agents' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sign Up — Anban',
    description: 'Create your Anban account and start collaborating with AI agents.',
    images: ['/og-image.png'],
  },
};

export default function SignupPage() {
  return <SignupClient />;
}
