import { NextRequest, NextResponse } from 'next/server';
import { users, toId } from '@/lib/db/mongo';
import { verifyAuth, isUnauthorizedError, unauthorizedResponse } from '@/lib/auth/helpers';
import { requestAppUrl } from '@/lib/appUrl.server';
import crypto from 'crypto';

export const runtime = 'nodejs';

/**
 * POST /api/user/share — Generate or return existing account-level share link
 * DELETE /api/user/share — Revoke share link
 */

export async function POST(request: NextRequest) {
  try {
    const userId = await verifyAuth(request);

    const user = await users.findOne({ _id: toId(userId) });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Generate share token if not exists
    let shareToken = user.shareToken;
    if (!shareToken) {
      shareToken = crypto.randomUUID();
      await users.updateOne({ _id: toId(userId) }, { $set: { shareToken } });
    }

    const appUrl = requestAppUrl(request);

    return NextResponse.json({
      shareUrl: `${appUrl}/join/${shareToken}`,
      shareToken,
    });
  } catch (error) {
    console.error('Error generating share link:', error);
    if (isUnauthorizedError(error)) {
      return unauthorizedResponse(error.message);
    }
    return NextResponse.json({ error: 'Failed to generate share link' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await verifyAuth(request);

    await users.updateOne({ _id: toId(userId) }, { $set: { shareToken: null } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error revoking share link:', error);
    if (isUnauthorizedError(error)) {
      return unauthorizedResponse(error.message);
    }
    return NextResponse.json({ error: 'Failed to revoke share link' }, { status: 500 });
  }
}
