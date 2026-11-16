import { NextRequest, NextResponse } from 'next/server';
import { agentConfigs, toId } from '@/lib/db/mongo';
import { verifyAuth, isUnauthorizedError, unauthorizedResponse } from '@/lib/auth/helpers';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const runtime = 'nodejs';

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const userId = await verifyAuth(request);

    const { id } = await context.params;

    // Get agent config by ID and verify ownership
    const agent = /^[a-fA-F0-9]{24}$/.test(id)
      ? await agentConfigs.findOne({ _id: toId(id), ownerId: toId(userId) })
      : null;

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    return NextResponse.json(agent);
  } catch (error) {
    console.error('Error fetching agent:', error);
    if (isUnauthorizedError(error)) {
      return unauthorizedResponse(error.message);
    }
    return NextResponse.json({ error: 'Failed to fetch agent' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const userId = await verifyAuth(request);

    const { id } = await context.params;
    const body = await request.json();
    const { name, openClawId, description, model, enabled } = body;

    // Verify agent exists and user owns it
    const existingAgent = /^[a-fA-F0-9]{24}$/.test(id)
      ? await agentConfigs.findOne({ _id: toId(id), ownerId: toId(userId) })
      : null;

    if (!existingAgent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Build update data with only provided fields
    const updateData: {
      name?: string;
      openClawId?: string;
      description?: string | null;
      model?: string | null;
      enabled?: boolean;
    } = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ error: 'Name must be a non-empty string' }, { status: 400 });
      }
      updateData.name = name.trim();
    }

    if (openClawId !== undefined) {
      if (typeof openClawId !== 'string' || openClawId.trim().length === 0) {
        return NextResponse.json({ error: 'OpenClaw ID must be a non-empty string' }, { status: 400 });
      }
      updateData.openClawId = openClawId.trim();
    }

    if (description !== undefined) {
      if (description === null) {
        updateData.description = null;
      } else if (typeof description === 'string') {
        updateData.description = description.trim();
      } else {
        return NextResponse.json({ error: 'Description must be a string or null' }, { status: 400 });
      }
    }

    if (model !== undefined) {
      if (model === null) {
        updateData.model = null;
      } else if (typeof model === 'string') {
        updateData.model = model.trim();
      } else {
        return NextResponse.json({ error: 'Model must be a string or null' }, { status: 400 });
      }
    }

    if (enabled !== undefined) {
      if (typeof enabled !== 'boolean') {
        return NextResponse.json({ error: 'Enabled must be a boolean' }, { status: 400 });
      }
      updateData.enabled = enabled;
    }

    // Update agent config
    await agentConfigs.updateOne({ _id: toId(id) }, { $set: updateData });

    const agent = await agentConfigs.findOne({ _id: toId(id) });

    return NextResponse.json(agent);
  } catch (error) {
    console.error('Error updating agent:', error);
    if (isUnauthorizedError(error)) {
      return unauthorizedResponse(error.message);
    }
    return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const userId = await verifyAuth(request);

    const { id } = await context.params;

    // Verify agent exists and user owns it before deletion
    const existingAgent = /^[a-fA-F0-9]{24}$/.test(id)
      ? await agentConfigs.findOne({ _id: toId(id), ownerId: toId(userId) })
      : null;

    if (!existingAgent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Delete agent config
    await agentConfigs.deleteOne({ _id: toId(id) });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting agent:', error);
    if (isUnauthorizedError(error)) {
      return unauthorizedResponse(error.message);
    }
    return NextResponse.json({ error: 'Failed to delete agent' }, { status: 500 });
  }
}
