import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAgentAuth } from '@/lib/auth/helpers';

export const runtime = 'nodejs';

/**
 * Agent self-service: get own profile
 * GET /api/agent/profile
 * Headers: Authorization: Bearer <agentToken>
 */
export async function GET(request: NextRequest) {
  try {
    const { agentId } = await verifyAgentAuth(request);

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { id: true, name: true, createdAt: true },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    return NextResponse.json(agent);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching agent profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

/**
 * Agent self-service: rename self
 * PATCH /api/agent/profile
 * Headers: Authorization: Bearer <agentToken>
 * Body: { name: string }
 */
export async function PATCH(request: NextRequest) {
  try {
    const { agentId } = await verifyAgentAuth(request);

    const body = await request.json();
    const { name } = body;

    if (typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required (min 1 character)' }, { status: 400 });
    }

    const updated = await prisma.agent.update({
      where: { id: agentId },
      data: { name: name.trim() },
    });

    return NextResponse.json({ id: updated.id, name: updated.name });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error updating agent profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
