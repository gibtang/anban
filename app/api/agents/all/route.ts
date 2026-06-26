import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAuth } from '@/lib/auth/helpers';
import { validateAgentName } from '@/lib/agents/name-validation';

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
        lastAccessAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = agents.map((a: { id: string; name: string; token: string | null; createdAt: Date; lastAccessAt: Date | null }) => ({
      id: a.id,
      name: a.name,
      status: a.token && !a.token.startsWith('__pending__') ? 'approved' as const : 'pending' as const,
      token: a.token && !a.token.startsWith('__pending__') ? a.token : null,
      lastAccessAt: a.lastAccessAt ? a.lastAccessAt.toISOString() : null,
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
 * Rename an agent
 * PATCH /api/agents/all
 * Body: { agentId: string, name: string }
 */
export async function PATCH(request: NextRequest) {
  try {
    const userId = await verifyAuth(request);

    let body: { agentId?: string; name?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const { agentId, name } = body;

    if (!agentId) {
      return NextResponse.json({ error: 'agentId is required' }, { status: 400 });
    }

    const result = validateAgentName(name);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Verify agent belongs to this user
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, ownerId: userId },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const updated = await prisma.agent.update({
      where: { id: agentId },
      data: { name: result.value },
    });

    return NextResponse.json({ id: updated.id, name: updated.name });
  } catch (error) {
    console.error('Error renaming agent:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to rename agent' }, { status: 500 });
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
