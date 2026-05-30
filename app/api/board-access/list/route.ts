import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAuth } from '@/lib/auth/helpers';

export const runtime = 'nodejs';

/**
 * List access requests for a board (board owner only)
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await verifyAuth(request);

    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get('boardId');

    if (!boardId) {
      return NextResponse.json({ error: 'boardId is required' }, { status: 400 });
    }

    // Verify board ownership
    const board = await prisma.board.findFirst({
      where: { id: boardId, ownerId: userId },
    });

    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    const requests = await prisma.boardAccess.findMany({
      where: { boardId },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            token: true,
          },
        },
      },
      orderBy: { requestedAt: 'desc' },
    });

    // Map to a flat shape for backward compat with UI
    const mapped = requests.map((r: { id: string; boardId: string; agentId: string; status: string; requestedAt: Date; approvedAt: Date | null; agent: { id: string; name: string; token: string } }) => ({
      id: r.id,
      boardId: r.boardId,
      agentId: r.agent?.id ?? r.agentId,
      agentName: r.agent?.name ?? 'Unknown',
      agentToken: r.agent?.token?.startsWith('__pending__') ? null : (r.agent?.token ?? null),
      status: r.status,
      requestedAt: r.requestedAt,
      approvedAt: r.approvedAt,
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error('Error listing access requests:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to list requests' }, { status: 500 });
  }
}

/**
 * Revoke agent access
 */
export async function DELETE(request: NextRequest) {
  try {
    const userId = await verifyAuth(request);
    const body = await request.json();
    const { accessId } = body;

    if (!accessId) {
      return NextResponse.json({ error: 'accessId is required' }, { status: 400 });
    }

    const accessRequest = await prisma.boardAccess.findUnique({
      where: { id: accessId },
    });

    if (!accessRequest) {
      return NextResponse.json({ error: 'Access request not found' }, { status: 404 });
    }

    // Verify board ownership
    const board = await prisma.board.findFirst({
      where: { id: accessRequest.boardId, ownerId: userId },
    });

    if (!board) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Clear agentId on any cards that referenced this agent
    await prisma.card.updateMany({
      where: { boardId: accessRequest.boardId, agentId: accessRequest.agentId },
      data: { agentId: null },
    });

    await prisma.boardAccess.delete({
      where: { id: accessId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error revoking access:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to revoke access' }, { status: 500 });
  }
}
