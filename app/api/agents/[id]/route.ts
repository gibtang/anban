import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyIdToken } from '@/lib/firebase/admin';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const runtime = 'nodejs';

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const token = request.cookies.get('firebase-auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decodedToken = await verifyIdToken(token);
    const firebaseUid = decodedToken.uid;

    // Get user by Firebase UID
    const user = await prisma.user.findUnique({
      where: { firebaseUid },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { id } = await context.params;

    // Get agent config by ID and verify ownership
    const agent = await prisma.agentConfig.findFirst({
      where: {
        id,
        ownerId: user.id,
      },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    return NextResponse.json(agent);
  } catch (error) {
    console.error('Error fetching agent:', error);
    return NextResponse.json({ error: 'Failed to fetch agent' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const token = request.cookies.get('firebase-auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decodedToken = await verifyIdToken(token);
    const firebaseUid = decodedToken.uid;

    // Get user by Firebase UID
    const user = await prisma.user.findUnique({
      where: { firebaseUid },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const { name, openClawId, description, model, enabled } = body;

    // Verify agent exists and user owns it
    const existingAgent = await prisma.agentConfig.findFirst({
      where: {
        id,
        ownerId: user.id,
      },
    });

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
    const agent = await prisma.agentConfig.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(agent);
  } catch (error) {
    console.error('Error updating agent:', error);
    return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const token = request.cookies.get('firebase-auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decodedToken = await verifyIdToken(token);
    const firebaseUid = decodedToken.uid;

    // Get user by Firebase UID
    const user = await prisma.user.findUnique({
      where: { firebaseUid },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { id } = await context.params;

    // Verify agent exists and user owns it before deletion
    const existingAgent = await prisma.agentConfig.findFirst({
      where: {
        id,
        ownerId: user.id,
      },
    });

    if (!existingAgent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Delete agent config
    await prisma.agentConfig.delete({
      where: { id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting agent:', error);
    return NextResponse.json({ error: 'Failed to delete agent' }, { status: 500 });
  }
}
