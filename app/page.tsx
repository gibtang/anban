'use client';

import { useAuth } from './contexts/AuthContext';
import { useEffect, useState } from 'react';
import { Navbar } from '@/components/landing/Navbar';
import { Hero } from '@/components/landing/Hero';
import { ProblemSolution } from '@/components/landing/ProblemSolution';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { Features } from '@/components/landing/Features';
import { Integrations } from '@/components/landing/Integrations';
import { SkillMd } from '@/components/landing/SkillMd';
import { OpenSource } from '@/components/landing/OpenSource';
import { CTASection } from '@/components/landing/CTASection';
import { Footer } from '@/components/landing/Footer';

export default function HomePage() {
  const { user, loading } = useAuth();
  const [stars, setStars] = useState(0);

  useEffect(() => {
    fetch('/api/github/stars')
      .then((res) => res.json())
      .then((data) => setStars(data.stars ?? 0))
      .catch(() => {});
  }, []);

  // Build context-aware href for "Try Cloud Version"
  const cloudHref = user ? '/boards' : '/login';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar cloudHref={cloudHref} />
      <main>
        <Hero cloudHref={cloudHref} />
        <ProblemSolution />
        <HowItWorks />
        <Features />
        <Integrations />
        <SkillMd />
        <OpenSource stars={stars} />
        <CTASection cloudHref={cloudHref} />
      </main>
      <Footer />
    </div>
  );
}
