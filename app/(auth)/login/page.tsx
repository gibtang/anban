import type { Metadata } from 'next';
import LoginClient from './login-client';

export const metadata: Metadata = {
  title: 'Sign In — Anban',
  alternates: {
    canonical: 'https://www.getanban.com/login',
  },
};

export default function LoginPage() {
  return <LoginClient />;
}
