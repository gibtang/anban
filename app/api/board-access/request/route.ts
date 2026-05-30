import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const runtime = 'nodejs';

const APPROVAL_EXPIRY_MS = 3 * 60 * 1000; // 3 minutes

/**
 * Public endpoint: request access to a board
 * Called from the /join/[token] page or by agents directly
 *
 * Looks up or creates an Agent by name, then creates a BoardAccess request
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

    // Look up board by share token
    const board = await prisma.board.findUnique({
      where: { shareToken },
    });

    if (!board) {
      return NextResponse.json({ error: 'Invalid or expired share link' }, { status: 404 });
    }

    // Look up or create Agent by name
    let agent = await prisma.agent.findFirst({
      where: { name: agentName.trim() },
    });

    if (!agent) {
      // Agent doesn't exist yet — will be created on approval
      // For now, check by name in a pending state
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // If agent exists, check for existing BoardAccess
    if (agent) {
      const existing = await prisma.boardAccess.findFirst({
        where: {
          boardId: board.id,
          agentId: agent.id,
        },
        orderBy: { requestedAt: 'desc' },
      });

      if (existing) {
        // Already approved — return token
        if (existing.status === 'approved') {
          return NextResponse.json({
            requestId: existing.id,
            status: 'approved',
            agentToken: agent.token,
          });
        }

        // Denied — tell agent
        if (existing.status === 'denied') {
          return NextResponse.json({
            requestId: existing.id,
            status: 'denied',
          });
        }

        // Pending and NOT expired — return existing
        if (existing.status === 'pending' && (Date.now() - existing.requestedAt.getTime()) <= APPROVAL_EXPIRY_MS) {
          const approvalUrl = `${appUrl}/approve/${existing.id}`;
          return NextResponse.json({
            requestId: existing.id,
            status: 'pending',
            approvalUrl,
            boardName: board.name,
            message: `Access already requested for board "${board.name}". Notify the board owner: ${approvalUrl}`,
          });
        }

        // Pending but EXPIRED — delete old, create new below
        await prisma.boardAccess.delete({ where: { id: existing.id } });
      }
    }

    // Create agent if it doesn't exist yet (without token — token generated on first approval)
    if (!agent) {
      agent = await prisma.agent.create({
        data: {
          name: agentName.trim(),
          token: '__pending__' + Date.now(), // placeholder, replaced on approval
        },
      });
    }

    // Create new access request
    const accessRequest = await prisma.boardAccess.create({
      data: {
        boardId: board.id,
        agentId: agent.id,
        status: 'pending',
      },
    });

    const approvalUrl = `${appUrl}/approve/${accessRequest.id}`;

    return NextResponse.json({
      requestId: accessRequest.id,
      status: 'pending',
      approvalUrl,
      boardName: board.name,
      message: `Access requested for board "${board.name}". Notify the board owner to approve by sending them this link: ${approvalUrl}`,
    }, { status: 201 });
  } catch (error) {
    console.error('Error requesting access:', error);
    return NextResponse.json({ error: 'Failed to request access' }, { status: 500 });
  }
}
