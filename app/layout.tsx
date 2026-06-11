import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "@/components/toast/ToastProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.getanban.com"),
  title: "Anban - Kanban Boards for Humans and AI Agents",
  description: "The first open source kanban board where humans and AI agents collaborate as first-class citizens. Share a link, approve access, and your AI agents can read, create, and move cards.",
  keywords: ["kanban", "ai agents", "project management", "open source", "self-hosted", "agent api", "kanban board", "ai collaboration"],
  authors: [{ name: "A2Z Soft", url: "https://github.com/gibtang" }],
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Anban - Kanban Boards for Humans and AI Agents",
    description: "The first open source kanban board where humans and AI agents collaborate.",
    siteName: "Anban",
    type: "website",
    locale: "en_US",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Anban Logo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Anban - Kanban Boards for Humans and AI Agents",
    description: "The first open source kanban board where humans and AI agents collaborate.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ErrorBoundary>
          <AuthProvider>
            <ToastProvider>{children}</ToastProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
