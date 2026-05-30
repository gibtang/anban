import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAuth } from '@/lib/auth/helpers';
import crypto from 'crypto';

export const runtime = 'nodejs';

/**
 * POST /api/user/share — Generate or return existing account-level share link
 * DELETE /api/user/share — Revoke share link
 */

export async function POST(request: NextRequest) {
  try {
    const userId = await verifyAuth(request);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Generate share token if not exists
    let shareToken = user.shareToken;
    if (!shareToken) {
      shareToken = crypto.randomUUID();
      await prisma.user.update({
        where: { id: userId },
        data: { shareToken },
      });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    return NextResponse.json({
      shareUrl: `${appUrl}/join/${shareToken}`,
      shareToken,
    });
  } catch (error) {
    console.error('Error generating share link:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to generate share link' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await verifyAuth(request);

    await prisma.user.update({
      where: { id: userId },
      data: { shareToken: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error revoking share link:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to revoke share link' }, { status: 500 });
  }
}
