import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAuth } from '@/lib/auth/helpers';

export const runtime = 'nodejs';

/**
 * List all agents on the account (user auth)
 * GET /api/agents/all
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await verifyAuth(request);

    const agents = await prisma.agent.findMany({
      where: { ownerId: userId },
      select: {
        id: true,
        name: true,
        token: true,
        approvalToken: true,
        approvalExpiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = agents.map((a: { id: string; name: string; token: string | null; createdAt: Date }) => ({
      id: a.id,
      name: a.name,
      status: a.token && !a.token.startsWith('__pending__') ? 'approved' as const : 'pending' as const,
      token: a.token && !a.token.startsWith('__pending__') ? a.token : null,
      createdAt: a.createdAt.toISOString(),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching agents:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
  }
}

/**
 * Delete an agent (revoke access)
 * DELETE /api/agents/all
 * Body: { agentId: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const userId = await verifyAuth(request);
    const body = await request.json();
    const { agentId } = body;

    if (!agentId) {
      return NextResponse.json({ error: 'agentId is required' }, { status: 400 });
    }

    // Verify agent belongs to this user
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, ownerId: userId },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Also delete related comments and unassign cards
    await prisma.comment.deleteMany({ where: { authorId: agentId, authorType: 'agent' } });
    await prisma.card.updateMany({ where: { agentId }, data: { agentId: null } });

    await prisma.agent.delete({ where: { id: agentId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting agent:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to delete agent' }, { status: 500 });
  }
}
