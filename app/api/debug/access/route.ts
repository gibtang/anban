import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const runtime = 'nodejs';

/**
 * TEMPORARY debug endpoint — remove after fixing agent dropdown
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get('boardId');

    const allAccess = await prisma.boardAccess.findMany({
      include: {
        agent: {
          select: { id: true, name: true, token: true },
        },
      },
      orderBy: { requestedAt: 'desc' },
    });

    const allAgents = await prisma.agent.findMany({});

    interface AccessRecord {
      id: string;
      boardId: string;
      agentId: string;
      status: string;
      requestedAt: Date;
      approvedAt: Date | null;
      agent: { id: string; name: string; token: string } | null;
    }

    const filtered: AccessRecord[] = boardId
      ? allAccess.filter((r: AccessRecord) => r.boardId === boardId)
      : allAccess;

    return NextResponse.json({
      totalAccessRecords: allAccess.length,
      filteredRecords: filtered.length,
      boardId: boardId || 'all',
      access: filtered.map((r: AccessRecord) => ({
        id: r.id,
        boardId: r.boardId,
        agentId: r.agentId,
        agentName: r.agent?.name ?? 'orphaned',
        agentTokenPrefix: r.agent?.token?.startsWith('__pending__') ? '__pending__' : 'has-real-token',
        status: r.status,
        requestedAt: r.requestedAt,
        approvedAt: r.approvedAt,
      })),
      agents: allAgents.map((a: { id: string; name: string; token: string | null }) => ({
        id: a.id,
        name: a.name,
        tokenPrefix: (a.token || '').substring(0, 20),
      })),
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
