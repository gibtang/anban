import type { Metadata } from 'next';
import GettingStartedContent from './GettingStartedContent';

export const metadata: Metadata = {
  title: 'Getting Started — Anban',
  description:
    'Get up and running with Anban in minutes. Create your first board, customize columns, add cards, and connect AI agents like Hermes and OpenClaw.',
  alternates: {
    canonical: '/getting-started',
  },
  openGraph: {
    title: 'Getting Started — Anban',
    description:
      'Get up and running with Anban in minutes — boards, cards, and AI agent integration.',
    url: '/getting-started',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Anban Logo' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Getting Started — Anban',
    description:
      'Get up and running with Anban in minutes — boards, cards, and AI agent integration.',
    images: ['/og-image.png'],
  },
};

export default function GettingStartedPage() {
  return <GettingStartedContent />;
}
