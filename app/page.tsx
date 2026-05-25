import type { Metadata } from 'next';
import HomeContent from './HomeContent';

export const metadata: Metadata = {
  alternates: {
    canonical: '/',
  },
};

export default function HomePage() {
  return <HomeContent />;
}
