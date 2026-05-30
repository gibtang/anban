import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const runtime = 'nodejs';

const APPROVAL_EXPIRY_MS = 3 * 60 * 1000;

/**
 * Public endpoint: get access request details for the approval page
 * No auth required — security comes from the UUID request ID + 3-min expiry
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const accessRequest = await prisma.boardAccess.findUnique({
      where: { id },
      include: { agent: { select: { name: true } } },
    });

    if (!accessRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Get board name
    const board = await prisma.board.findUnique({
      where: { id: accessRequest.boardId },
      select: { name: true },
    });

    // Check if expired
    const isExpired =
      accessRequest.status === 'pending' &&
      Date.now() - accessRequest.requestedAt.getTime() > APPROVAL_EXPIRY_MS;

    const effectiveStatus = isExpired ? 'expired' : accessRequest.status;

    return NextResponse.json({
      id: accessRequest.id,
      agentName: accessRequest.agent.name,
      status: effectiveStatus,
      requestedAt: accessRequest.requestedAt,
      boardName: board?.name || 'Unknown',
    });
  } catch (error) {
    console.error('Error fetching access details:', error);
    return NextResponse.json({ error: 'Failed to fetch details' }, { status: 500 });
  }
}
