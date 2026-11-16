import { NextRequest, NextResponse } from 'next/server';
import { verifyAgentAuth, isUnauthorizedError, unauthorizedResponse } from '@/lib/auth/helpers';
import { validateAgentName } from '@/lib/agents/name-validation';
import { agents, toId } from '@/lib/db/mongo';

export const runtime = 'nodejs';

/**
 * Agent self-service: get own profile
 * GET /api/agent/profile
 * Headers: Authorization: Bearer <agentToken>
 */
export async function GET(request: NextRequest) {
  try {
    const { agentId } = await verifyAgentAuth(request);

    const agent = await agents.findOne({ _id: toId(agentId) });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: agent.id,
      name: agent.name,
      createdAt: agent.createdAt,
    });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return unauthorizedResponse(error.message);
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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const { name } = body as { name?: unknown };

    const result = validateAgentName(name);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const matched = await agents.updateOne(
      { _id: toId(agentId) },
      { $set: { name: result.value } },
    );

    if (!matched) {
      throw new Error('Agent not found');
    }

    return NextResponse.json({ id: agentId, name: result.value });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return unauthorizedResponse(error.message);
    }
    console.error('Error updating agent profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
