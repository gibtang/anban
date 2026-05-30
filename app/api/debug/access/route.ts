import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const runtime = 'nodejs';

/**
 * TEMPORARY debug endpoint — remove after fixing agent dropdown
 * GET: raw MongoDB query to inspect BoardAccess/Agent data
 * DELETE: clean up stale records
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get('boardId');

    interface MongoCursor {
      cursor: { firstBatch: Record<string, unknown>[]; id: number; ns: string };
      ok: number;
    }

    // Find all BoardAccess records
    const filter: Record<string, unknown> = {};
    if (boardId) {
      filter.boardId = { $oid: boardId };
    }

    const allRecordsRaw = await prisma.$runCommandRaw({
      find: 'BoardAccess',
      filter,
      limit: 100,
    });

    const allRecords = (allRecordsRaw as MongoCursor).cursor?.firstBatch || [];

    // Get agents
    const agentsRaw = await prisma.$runCommandRaw({
      find: 'Agent',
      filter: {},
    });
    const agents = (agentsRaw as MongoCursor).cursor?.firstBatch || [];

    return NextResponse.json({
      totalRecords: allRecords.length,
      records: allRecords.map((r: Record<string, unknown>) => ({
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
 * DELETE: clean up stale BoardAccess records
 * Body: { filter: { status: 'pending', agentId: '...' } }
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { filter } = body;

    if (!filter) {
      return NextResponse.json({ error: 'filter required' }, { status: 400 });
    }

    // Build MongoDB filter
    const mongoFilter: Record<string, unknown> = {};
    if (filter.status) mongoFilter.status = filter.status;
    if (filter.agentId) mongoFilter.agentId = { $oid: filter.agentId };
    if (filter.nullAgentId) mongoFilter.agentId = null;

    const result = await prisma.$runCommandRaw({
      delete: 'BoardAccess',
      deletes: [{ q: mongoFilter, limit: 0 }],
    });

    interface DeleteResult { ok: number; n: number }
    const deleted = result as DeleteResult;
    return NextResponse.json({ success: true, deletedCount: deleted.n, filter: mongoFilter });
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
