import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAuth } from '@/lib/auth/helpers';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const userId = await verifyAuth(request);

    // Get agent configs owned by this user
    const agents = await prisma.agentConfig.findMany({
      where: { ownerId: userId },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(agents);
  } catch (error) {
    console.error('Error fetching agents:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await verifyAuth(request);

    const body = await request.json();
    const { name, openClawId, description, model } = body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!openClawId || typeof openClawId !== 'string' || openClawId.trim().length === 0) {
      return NextResponse.json({ error: 'OpenClaw ID is required' }, { status: 400 });
    }

    if (model && typeof model !== 'string') {
      return NextResponse.json({ error: 'Model must be a string' }, { status: 400 });
    }

    if (description && typeof description !== 'string') {
      return NextResponse.json({ error: 'Description must be a string' }, { status: 400 });
    }

    // Create agent config with owner
    const agent = await prisma.agentConfig.create({
      data: {
        name: name.trim(),
        openClawId: openClawId.trim(),
        description: description?.trim() || null,
        model: model?.trim() || null,
        ownerId: userId,
      },
    });

    return NextResponse.json(agent, { status: 201 });
  } catch (error) {
    console.error('Error creating agent:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 });
  }
}
