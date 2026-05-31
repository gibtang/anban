import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import crypto from 'crypto';

export const runtime = 'nodejs';

const APPROVAL_EXPIRY_MS = 3 * 60 * 1000; // 3 minutes

/**
 * Public endpoint: request access to an account
 * Looks up User by shareToken, creates/finds Agent with approvalToken
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shareToken, agentName } = body;

    if (!shareToken || typeof shareToken !== 'string') {
      return NextResponse.json({ error: 'shareToken is required' }, { status: 400 });
    }

    if (!agentName || typeof agentName !== 'string' || agentName.trim().length === 0) {
      return NextResponse.json({ error: 'Agent name is required' }, { status: 400 });
    }

    // Look up user by account-level share token
    const user = await prisma.user.findUnique({
      where: { shareToken },
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired share link' }, { status: 404 });
    }

    // Verify account has at least one board
    const boardCount = await prisma.board.count({ where: { ownerId: user.id } });
    if (boardCount === 0) {
      return NextResponse.json({ error: 'No boards found for this account' }, { status: 404 });
    }

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').trim();

    // Look up existing agent by name + account
    let agent = await prisma.agent.findFirst({
      where: { name: agentName.trim(), ownerId: user.id },
    });

    if (agent) {
      // Already approved (has a real token)
      if (agent.token && !agent.token.startsWith('__pending__')) {
        return NextResponse.json({
          status: 'approved',
          agentToken: agent.token,
        });
      }

      // Pending and NOT expired
      if (agent.approvalToken && agent.approvalExpiresAt && agent.approvalExpiresAt > new Date()) {
        return NextResponse.json({
          status: 'pending',
          approvalToken: agent.approvalToken,
          approvalUrl: `${appUrl}/approve/${agent.approvalToken}`,
          message: `Access already requested. Notify the account owner: ${appUrl}/approve/${agent.approvalToken}`,
        });
      }

      // Expired — generate new approval token
      const approvalToken = crypto.randomBytes(32).toString('hex');
      const approvalExpiresAt = new Date(Date.now() + APPROVAL_EXPIRY_MS);
      agent = await prisma.agent.update({
        where: { id: agent.id },
        data: { approvalToken, approvalExpiresAt },
      });

      return NextResponse.json({
        status: 'pending',
        approvalToken: agent.approvalToken,
        approvalUrl: `${appUrl}/approve/${agent.approvalToken}`,
        message: `New approval link generated. Notify the account owner: ${appUrl}/approve/${agent.approvalToken}`,
      });
    }

    // Create new agent with approval token
    const approvalToken = crypto.randomBytes(32).toString('hex');
    const approvalExpiresAt = new Date(Date.now() + APPROVAL_EXPIRY_MS);

    agent = await prisma.agent.create({
      data: {
        name: agentName.trim(),
        token: '__pending__' + Date.now(),
        ownerId: user.id,
        approvalToken,
        approvalExpiresAt,
      },
    });

    return NextResponse.json({
      status: 'pending',
      approvalToken: agent.approvalToken,
      approvalUrl: `${appUrl}/approve/${agent.approvalToken}`,
      message: `Access requested for account with ${boardCount} board(s). Notify the account owner: ${appUrl}/approve/${agent.approvalToken}`,
    }, { status: 201 });
  } catch (error) {
    console.error('Error requesting access:', error);
    return NextResponse.json({ error: 'Failed to request access' }, { status: 500 });
  }
}
