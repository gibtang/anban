import { NextRequest, NextResponse } from 'next/server';
import { agents, comments, cards, toId } from '@/lib/db/mongo';
import { verifyAuth, isUnauthorizedError, unauthorizedResponse } from '@/lib/auth/helpers';
import { validateAgentName } from '@/lib/agents/name-validation';

const isValidId = (id: string) => /^[a-fA-F0-9]{24}$/.test(id);

export const runtime = 'nodejs';

/**
 * List all agents on the account (user auth)
 * GET /api/agents/all
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await verifyAuth(request);

    const agentDocs = await agents.find(
      { ownerId: toId(userId) },
      { sort: { createdAt: -1 } }
    );

    const result = agentDocs.map((a) => ({
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
    if (isUnauthorizedError(error)) {
      return unauthorizedResponse(error.message);
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
    const agent = isValidId(agentId)
      ? await agents.findOne({ _id: toId(agentId), ownerId: toId(userId) })
      : null;

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    await agents.updateOne(
      { _id: toId(agentId) },
      { $set: { name: result.value } }
    );

    return NextResponse.json({ id: agentId, name: result.value });
  } catch (error) {
    console.error('Error renaming agent:', error);
    if (isUnauthorizedError(error)) {
      return unauthorizedResponse(error.message);
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
    const agent = isValidId(agentId)
      ? await agents.findOne({ _id: toId(agentId), ownerId: toId(userId) })
      : null;

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Also delete related comments and unassign cards
    await comments.raw().deleteMany({ authorId: toId(agentId), authorType: 'agent' });
    await cards.raw().updateMany({ agentId: toId(agentId) }, { $set: { agentId: null, updatedAt: new Date() } });

    await agents.deleteOne({ _id: toId(agentId) });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting agent:', error);
    if (isUnauthorizedError(error)) {
      return unauthorizedResponse(error.message);
    }
    return NextResponse.json({ error: 'Failed to delete agent' }, { status: 500 });
  }
}
