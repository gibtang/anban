import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const runtime = 'nodejs';

/**
 * OG tag endpoint for board URLs.
 * Returns minimal HTML with Open Graph meta tags so that link previews
 * (Telegram, Twitter, Slack, etc.) show the board name.
 *
 * Used by proxy.ts rewrite — unauthenticated requests to /boards/[id]
 * are rewritten here so crawlers see OG tags instead of a login redirect.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { id: boardId } = await context.params;

  let title = 'Board';
  try {
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: { name: true },
    });
    if (board?.name) title = board.name;
  } catch {
    // DB error or invalid ID — fall back to generic title
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} — Anban</title>
  <meta property="og:title" content="${escapeHtml(title)} — Anban" />
  <meta property="og:description" content="View this board on Anban — Kanban boards for humans and AI agents." />
  <meta property="og:site_name" content="Anban" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="https://www.getanban.com/og-image.png" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${escapeHtml(title)} — Anban" />
  <meta http-equiv="refresh" content="0; url=/login" />
</head>
<body>
  <p style="font-family:sans-serif;text-align:center;padding:2rem">Redirecting…</p>
  <script>window.location.href='/login';</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
