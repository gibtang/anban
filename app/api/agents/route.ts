import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyIdToken } from '@/lib/firebase/admin';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
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

    // Get agent configs owned by this user
    const agents = await prisma.agentConfig.findMany({
      where: { ownerId: user.id },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(agents);
  } catch (error) {
    console.error('Error fetching agents:', error);
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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
        ownerId: user.id,
      },
    });

    return NextResponse.json(agent, { status: 201 });
  } catch (error) {
    console.error('Error creating agent:', error);
    return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 });
  }
}
