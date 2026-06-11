import type { Metadata } from 'next';
import SignupClient from './signup-client';

export const metadata: Metadata = {
  title: 'Sign Up — Anban',
  alternates: {
    canonical: 'https://www.getanban.com/signup',
  },
  openGraph: {
    title: 'Sign Up — Anban',
    description: 'Create your Anban account and start collaborating with AI agents.',
    url: 'https://www.getanban.com/signup',
  },
};

export default function SignupPage() {
  return <SignupClient />;
}
