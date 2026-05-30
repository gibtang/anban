import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import crypto from 'crypto';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const APPROVAL_EXPIRY_MS = 3 * 60 * 1000; // 3 minutes

function isExpired(requestedAt: Date): boolean {
  return Date.now() - requestedAt.getTime() > APPROVAL_EXPIRY_MS;
}

/**
 * GET: poll access request status (used by join page / agent)
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const accessRequest = await prisma.boardAccess.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        agentId: true,
        requestedAt: true,
        agent: {
          select: {
            token: true,
            name: true,
          },
        },
      },
    });

    if (!accessRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Check if pending request has expired
    const effectiveStatus =
      accessRequest.status === 'pending' && isExpired(accessRequest.requestedAt)
        ? 'expired'
        : accessRequest.status;

    // Only return real token for approved requests with a non-placeholder token
    const rawToken = accessRequest.agent?.token;
    const agentToken = effectiveStatus === 'approved' && rawToken && !rawToken.startsWith('__pending__')
      ? rawToken
      : null;

    return NextResponse.json({
      requestId: accessRequest.id,
      status: effectiveStatus,
      agentToken,
    });
  } catch (error) {
    console.error('Error fetching access request:', error);
    return NextResponse.json({ error: 'Failed to fetch request status' }, { status: 500 });
  }
}

/**
 * PUT: approve or deny — no login required, token-based security
 * Link expires after 3 minutes
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { action } = body; // 'approve' or 'deny'

    if (!action || !['approve', 'deny'].includes(action)) {
      return NextResponse.json({ error: 'action must be "approve" or "deny"' }, { status: 400 });
    }

    const accessRequest = await prisma.boardAccess.findUnique({
      where: { id },
      include: { agent: true },
    });

    if (!accessRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    if (accessRequest.status !== 'pending') {
      return NextResponse.json({ error: `Request already ${accessRequest.status}` }, { status: 410 });
    }

    // Check expiration
    if (isExpired(accessRequest.requestedAt)) {
      return NextResponse.json({ error: 'expired', message: 'This approval link has expired. Ask the agent for a new link.' }, { status: 410 });
    }

    // Account-level: approve/deny ALL pending BoardAccess records for this agent
    const allPending = await prisma.boardAccess.findMany({
      where: {
        agentId: accessRequest.agentId,
        status: 'pending',
      },
    });

    if (action === 'deny') {
      await prisma.boardAccess.updateMany({
        where: {
          agentId: accessRequest.agentId,
          status: 'pending',
        },
        data: {
          status: 'denied',
          approvedAt: new Date(),
        },
      });

      return NextResponse.json({ status: 'denied', boardCount: allPending.length });
    }

    // Approve: generate a real agent token if it's still a placeholder
    let agentToken = accessRequest.agent?.token || '__pending__';
    if (agentToken.startsWith('__pending__')) {
      agentToken = crypto.randomBytes(32).toString('hex');
      await prisma.agent.update({
        where: { id: accessRequest.agentId },
        data: { token: agentToken },
      });
    }

    // Approve ALL pending BoardAccess records for this agent (account-level)
    await prisma.boardAccess.updateMany({
      where: {
        agentId: accessRequest.agentId,
        status: 'pending',
      },
      data: {
        status: 'approved',
        approvedAt: new Date(),
      },
    });

    return NextResponse.json({ status: 'approved', agentToken, boardCount: allPending.length });
  } catch (error) {
    console.error('Error updating access request:', error);
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
  }
}
