import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const runtime = 'nodejs';

/**
 * Public share endpoint: returns card details for agent-authenticated access
 * GET /card/<cardId>?token=<agentToken>
 * Content negotiation: JSON for curl/agents, HTML page for browsers
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: cardId } = await context.params;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 401 });
    }

    // Validate agent exists with this token
    const agent = await prisma.agent.findUnique({
      where: { token },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Invalid or revoked token' }, { status: 403 });
    }

    // Check agent has approved access to ANY board (we'll verify card belongs to one of those boards)
    const accesses = await prisma.boardAccess.findMany({
      where: {
        agentId: agent.id,
        status: 'approved',
      },
      select: { boardId: true },
    });

    const accessibleBoardIds = accesses.map((a: { boardId: string }) => a.boardId);

    // Fetch card — must be on one of the agent's accessible boards
    const card = await prisma.card.findFirst({
      where: {
        id: cardId,
        boardId: { in: accessibleBoardIds },
      },
    });

    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    // Get column name
    const column = await prisma.column.findFirst({
      where: { id: card.columnId },
    });

    // Get board name
    const board = await prisma.board.findFirst({
      where: { id: card.boardId },
    });

    // Get comments
    const comments = await prisma.comment.findMany({
      where: { cardId: card.id },
      orderBy: { createdAt: 'asc' },
    });

    // Get assignee name if card is assigned (agentId field)
    let assigneeName: string | null = null;
    if (card.agentId) {
      const assigneeAgent = await prisma.agent.findUnique({
        where: { id: card.agentId },
        select: { name: true },
      });
      assigneeName = assigneeAgent?.name || null;
    }

    const cardDetails = {
      id: card.id,
      title: card.title,
      description: card.description,
      column: column?.name || 'Unknown',
      tags: card.tags,
      assignee: assigneeName,
      boardName: board?.name || 'Unknown',
      comments: comments.map((c: { authorName: string; content: string; createdAt: Date }) => ({
        author: c.authorName,
        content: c.content,
        createdAt: c.createdAt,
      })),
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
    };

    // Content negotiation
    const accept = request.headers.get('Accept') || '';
    const isBrowser = accept.includes('text/html');

    if (isBrowser) {
      // Return a simple HTML card detail page for browsers
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(cardDetails.title)} - Anban</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f9fafb; color: #111827; padding: 2rem; }
    .card { max-width: 640px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e5e7eb; overflow: hidden; }
    .header { padding: 1.5rem; border-bottom: 1px solid #e5e7eb; }
    .header h1 { font-size: 1.25rem; font-weight: 600; }
    .meta { display: flex; gap: 0.5rem; margin-top: 0.75rem; flex-wrap: wrap; align-items: center; }
    .badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 500; }
    .badge-column { background: #e0e7ff; color: #3730a3; }
    .badge-tag { background: #dbeafe; color: #1e40af; }
    .badge-agent { background: #d1fae5; color: #065f46; }
    .board-name { font-size: 0.75rem; color: #6b7280; }
    .body { padding: 1.5rem; }
    .body h2 { font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.5rem; }
    .body p { font-size: 0.875rem; color: #4b5563; line-height: 1.6; white-space: pre-wrap; }
    .comments { padding: 1.5rem; border-top: 1px solid #e5e7eb; }
    .comments h2 { font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 1rem; }
    .comment { padding: 0.75rem; background: #f9fafb; border-radius: 8px; margin-bottom: 0.5rem; }
    .comment-author { font-size: 0.75rem; font-weight: 600; color: #374151; }
    .comment-content { font-size: 0.8125rem; color: #4b5563; margin-top: 0.25rem; }
    .comment-time { font-size: 0.6875rem; color: #9ca3af; margin-top: 0.25rem; }
    .footer { padding: 1rem 1.5rem; border-top: 1px solid #e5e7eb; font-size: 0.6875rem; color: #9ca3af; }
    .no-comments { font-size: 0.8125rem; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>${escapeHtml(cardDetails.title)}</h1>
      <div class="meta">
        <span class="badge badge-column">${escapeHtml(cardDetails.column)}</span>
        <span class="badge badge-agent">${escapeHtml(cardDetails.assignee || '')}</span>
        ${cardDetails.tags.map((t: string) => `<span class="badge badge-tag">${escapeHtml(t)}</span>`).join('')}
      </div>
      <div class="board-name" style="margin-top:0.5rem">Board: ${escapeHtml(cardDetails.boardName)}</div>
    </div>
    ${cardDetails.description ? `<div class="body"><h2>Description</h2><p>${escapeHtml(cardDetails.description)}</p></div>` : ''}
    <div class="comments">
      <h2>Comments (${cardDetails.comments.length})</h2>
      ${cardDetails.comments.length > 0
        ? cardDetails.comments.map((c: { author: string; content: string; createdAt: string }) => `
          <div class="comment">
            <div class="comment-author">${escapeHtml(c.author)}</div>
            <div class="comment-content">${escapeHtml(c.content)}</div>
            <div class="comment-time">${new Date(c.createdAt).toLocaleString()}</div>
          </div>
        `).join('')
        : '<p class="no-comments">No comments yet.</p>'
      }
    </div>
    <div class="footer">
      Created: ${new Date(cardDetails.createdAt).toLocaleString()} · Updated: ${new Date(cardDetails.updatedAt).toLocaleString()}
    </div>
  </div>
</body>
</html>`;
      return new NextResponse(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Return JSON for curl / API clients
    return NextResponse.json(cardDetails);
  } catch (error) {
    console.error('Error in card share endpoint:', error);
    return NextResponse.json({ error: 'Failed to fetch card details' }, { status: 500 });
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
