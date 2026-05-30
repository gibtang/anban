import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const runtime = 'nodejs';

/**
 * TEMPORARY debug endpoint — remove after fixing agent dropdown
 * Uses raw MongoDB to bypass Prisma's type validation on null agentId
 */
export async function GET(request: NextRequest) {
  try {
    // Find all BoardAccess records with null agentId using raw MongoDB
    const nullAgentRecords = await prisma.$runCommandRaw({
      find: 'BoardAccess',
      filter: { agentId: null },
    });

    interface MongoCursor {
      cursor: { firstBatch: Record<string, unknown>[]; id: number; ns: string };
      ok: number;
    }

    const cursor = nullAgentRecords as MongoCursor;
    const nullRecords = cursor.cursor?.firstBatch || [];

    // Find all BoardAccess records using raw query to avoid Prisma crash
    const allRecordsRaw = await prisma.$runCommandRaw({
      find: 'BoardAccess',
      filter: {},
      limit: 50,
    });

    const allRecords = (allRecordsRaw as MongoCursor).cursor?.firstBatch || [];

    // Also get agents
    const agentsRaw = await prisma.$runCommandRaw({
      find: 'Agent',
      filter: {},
    });
    const agents = (agentsRaw as MongoCursor).cursor?.firstBatch || [];

    return NextResponse.json({
      nullAgentRecords: nullRecords.length,
      nullRecords: nullRecords.map((r: Record<string, unknown>) => ({
        _id: r._id,
        boardId: r.boardId,
        agentId: r.agentId,
        status: r.status,
      })),
      totalRecords: allRecords.length,
      allRecords: allRecords.map((r: Record<string, unknown>) => ({
        _id: r._id,
        boardId: r.boardId,
        agentId: r.agentId,
        status: r.status,
        requestedAt: r.requestedAt,
      })),
      totalAgents: agents.length,
      agents: agents.map((a: Record<string, unknown>) => ({
        _id: a._id,
        name: a.name,
        token: typeof a.token === 'string' ? a.token.substring(0, 30) + '...' : a.token,
      })),
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * DELETE: remove BoardAccess records with null agentId
 */
export async function DELETE(request: NextRequest) {
  try {
    const result = await prisma.$runCommandRaw({
      delete: 'BoardAccess',
      deletes: [{ q: { agentId: null }, limit: 0 }],
    });

    interface DeleteResult {
      ok: number;
      n: number;
    }

    const deleted = result as DeleteResult;
    return NextResponse.json({
      success: true,
      deletedCount: deleted.n,
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
