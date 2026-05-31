import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import crypto from 'crypto';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET: poll approval status by approvalToken
 * The `id` param IS the approvalToken
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: approvalToken } = await context.params;

    const agent = await prisma.agent.findUnique({
      where: { approvalToken },
      select: {
        id: true,
        name: true,
        token: true,
        approvalToken: true,
        approvalExpiresAt: true,
      },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Already approved (has a real token)
    if (agent.token && !agent.token.startsWith('__pending__')) {
      return NextResponse.json({
        status: 'approved',
        agentName: agent.name,
        agentToken: agent.token,
      });
    }

    // Check if approval link expired
    if (agent.approvalExpiresAt && agent.approvalExpiresAt < new Date()) {
      return NextResponse.json({ status: 'expired', agentName: agent.name });
    }

    return NextResponse.json({ status: 'pending', agentName: agent.name });
  } catch (error) {
    console.error('Error fetching approval status:', error);
    return NextResponse.json({ error: 'Failed to fetch request status' }, { status: 500 });
  }
}

/**
 * PUT: approve or deny — no login required, security via approvalToken + expiry
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id: approvalToken } = await context.params;
    const body = await request.json();
    const { action } = body; // 'approve' or 'deny'

    if (!action || !['approve', 'deny'].includes(action)) {
      return NextResponse.json({ error: 'action must be "approve" or "deny"' }, { status: 400 });
    }

    const agent = await prisma.agent.findUnique({
      where: { approvalToken },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Already processed
    if (agent.token && !agent.token.startsWith('__pending__')) {
      return NextResponse.json({ error: 'Request already approved' }, { status: 410 });
    }

    // Check expiration
    if (agent.approvalExpiresAt && agent.approvalExpiresAt < new Date()) {
      return NextResponse.json({ error: 'expired', message: 'This approval link has expired. Ask the agent for a new link.' }, { status: 410 });
    }

    if (action === 'deny') {
      // Clear approval token so it can't be reused
      await prisma.agent.update({
        where: { id: agent.id },
        data: { approvalToken: null, approvalExpiresAt: null },
      });
      return NextResponse.json({ status: 'denied' });
    }

    // Approve: generate a real agent token
    const agentToken = crypto.randomBytes(32).toString('hex');
    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        token: agentToken,
        approvalToken: null,
        approvalExpiresAt: null,
      },
    });

    return NextResponse.json({ status: 'approved', agentToken });
  } catch (error) {
    console.error('Error updating approval:', error);
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
  }
}
