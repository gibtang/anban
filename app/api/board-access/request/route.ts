import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const runtime = 'nodejs';

const APPROVAL_EXPIRY_MS = 3 * 60 * 1000; // 3 minutes

/**
 * Public endpoint: request access to all boards on an account
 * Called from the /join/[token] page or by agents directly
 *
 * Looks up User by shareToken (account-level), then creates BoardAccess
 * requests for ALL boards owned by that user
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

    // Get all boards owned by this user
    const boards = await prisma.board.findMany({
      where: { ownerId: user.id },
      select: { id: true, name: true },
    }) as { id: string; name: string }[];

    if (boards.length === 0) {
      return NextResponse.json({ error: 'No boards found for this account' }, { status: 404 });
    }

    // Look up or create Agent by name
    let agent = await prisma.agent.findFirst({
      where: { name: agentName.trim() },
    });

    if (!agent) {
      // Agent doesn't exist yet — will be created below
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Check existing BoardAccess for the FIRST board (for backwards compat with approval flow)
    // The approval of any board grants the agent token which works for all boards
    const primaryBoard = boards[0];

    if (agent) {
      const existing = await prisma.boardAccess.findFirst({
        where: {
          boardId: primaryBoard.id,
          agentId: agent.id,
        },
        orderBy: { requestedAt: 'desc' },
      });

      if (existing) {
        // Already approved — return real token
        if (existing.status === 'approved') {
          const realToken = agent.token?.startsWith('__pending__') ? null : (agent.token ?? null);
          return NextResponse.json({
            requestId: existing.id,
            status: 'approved',
            agentToken: realToken,
          });
        }

        // Denied
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
            boardName: primaryBoard.name,
            message: `Access already requested for "${primaryBoard.name}". Notify the board owner: ${approvalUrl}`,
          });
        }

        // Pending but EXPIRED — delete old, create new below
        await prisma.boardAccess.delete({ where: { id: existing.id } });
      }
    }

    // Create agent if it doesn't exist yet
    if (!agent) {
      agent = await prisma.agent.create({
        data: {
          name: agentName.trim(),
          token: '__pending__' + Date.now(),
        },
      });
    }

    // Create BoardAccess for ALL boards owned by this user
    const accessRequests = [];
    for (const board of boards) {
      // Skip if access already exists for this board+agent
      const existingAccess = await prisma.boardAccess.findFirst({
        where: { boardId: board.id, agentId: agent.id },
      });

      if (!existingAccess) {
        const accessRequest = await prisma.boardAccess.create({
          data: {
            boardId: board.id,
            agentId: agent.id,
            status: 'pending',
          },
        });
        accessRequests.push(accessRequest);
      }
    }

    // Use the first access request for the approval URL
    const primaryRequest = accessRequests[0];
    if (!primaryRequest) {
      // All boards already have access requests — find existing
      const existingPrimary = await prisma.boardAccess.findFirst({
        where: { boardId: primaryBoard.id, agentId: agent.id },
        orderBy: { requestedAt: 'desc' },
      });

      if (existingPrimary) {
        const approvalUrl = `${appUrl}/approve/${existingPrimary.id}`;
        return NextResponse.json({
          requestId: existingPrimary.id,
          status: existingPrimary.status as string,
          approvalUrl: existingPrimary.status === 'pending' ? approvalUrl : undefined,
          boardName: primaryBoard.name,
          message: `Access already exists for "${primaryBoard.name}"`,
        });
      }
    }

    const approvalUrl = `${appUrl}/approve/${primaryRequest.id}`;
    const boardNames = boards.map(b => b.name).join(', ');

    return NextResponse.json({
      requestId: primaryRequest.id,
      status: 'pending',
      approvalUrl,
      boardName: primaryBoard.name,
      boardNames,
      message: `Access requested for all boards (${boardNames}). Notify the account owner to approve by sending them this link: ${approvalUrl}`,
    }, { status: 201 });
  } catch (error) {
    console.error('Error requesting access:', error);
    return NextResponse.json({ error: 'Failed to request access' }, { status: 500 });
  }
}
