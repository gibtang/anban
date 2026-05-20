import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const runtime = 'nodejs';

/**
 * Public endpoint: returns machine-readable join instructions for AI agents.
 *
 * Called with: GET /api/board-access/join-info?shareToken=<token>
 * Or: GET /join/<token> with Accept: application/json header
 *
 * Returns:
 *  - Board info (name, id)
 *  - The shareToken extracted from the URL
 *  - Step-by-step API instructions for the agent to follow
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shareToken = searchParams.get('shareToken');

    if (!shareToken) {
      return NextResponse.json(
        { error: 'shareToken query parameter is required' },
        { status: 400 }
      );
    }

    const board = await prisma.board.findUnique({
      where: { shareToken },
      select: { id: true, name: true },
    });

    if (!board) {
      return NextResponse.json(
        { error: 'Invalid or expired share link' },
        { status: 404 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    return NextResponse.json({
      type: 'anban-board-join',
      board: {
        id: board.id,
        name: board.name,
      },
      shareToken,
      instructions: {
        summary: `You are invited to join the "${board.name}" board on Anban (a kanban board). Follow these steps to get access.`,
        steps: [
          {
            step: 1,
            action: 'Request access',
            method: 'POST',
            url: `${appUrl}/api/board-access/request`,
            headers: { 'Content-Type': 'application/json' },
            body: {
              shareToken,
              agentName: '<YOUR_AGENT_NAME>',
            },
            description: 'Send your agent name to request access. Use a descriptive name like "Research Bot" or "Task Manager".',
            response: {
              requestId: '<string>',
              status: 'pending',
              approvalUrl: '<string — send this URL back to the board owner>',
              boardName: board.name,
              message: '<string>',
            },
          },
          {
            step: 2,
            action: 'Notify board owner',
            description: 'Send the approvalUrl from step 1 back to the person who shared this link with you. They must click it to approve your access.',
          },
          {
            step: 3,
            action: 'Poll for approval',
            method: 'GET',
            url: `${appUrl}/api/board-access/<requestId>`,
            description: 'Poll this endpoint every 3-5 seconds until status changes from "pending" to "approved" or "denied". The request expires after 3 minutes — if it expires, repeat from step 1.',
            response: {
              requestId: '<string>',
              status: '<pending|approved|denied|expired>',
              agentToken: '<string — only present when approved>',
            },
          },
          {
            step: 4,
            action: 'Use the board API',
            description: 'Once approved, use the agentToken as a Bearer token to interact with the board.',
            endpoints: {
              readBoard: {
                method: 'GET',
                url: `${appUrl}/api/agent/board`,
                headers: { Authorization: 'Bearer <agentToken>' },
                description: 'Returns board name, columns, and all cards.',
              },
              createCard: {
                method: 'POST',
                url: `${appUrl}/api/agent/cards`,
                headers: {
                  Authorization: 'Bearer <agentToken>',
                  'Content-Type': 'application/json',
                },
                body: {
                  title: '<card title>',
                  description: '<optional description>',
                  columnId: '<column ID from readBoard>',
                },
                description: 'Create a new card in a column.',
              },
              updateCard: {
                method: 'PUT',
                url: `${appUrl}/api/agent/cards/<cardId>`,
                headers: {
                  Authorization: 'Bearer <agentToken>',
                  'Content-Type': 'application/json',
                },
                body: {
                  title: '<optional new title>',
                  description: '<optional new description>',
                  columnId: '<optional new column ID to move card>',
                },
                description: 'Update a card (move between columns, change title/description).',
              },
              listAgents: {
                method: 'GET',
                url: `${appUrl}/api/agent/agents`,
                headers: { Authorization: 'Bearer <agentToken>' },
                description: 'List all approved agents on the board. Returns id, name, approvedAt, and isSelf for each agent.',
              },
              addComment: {
                method: 'POST',
                url: `${appUrl}/api/agent/cards/<cardId>/comments`,
                headers: {
                  Authorization: 'Bearer <agentToken>',
                  'Content-Type': 'application/json',
                },
                body: {
                  content: '<comment text, max 2000 chars>',
                },
                description: 'Add a comment to a card. Your agent name is automatically recorded as the author.',
              },
              listComments: {
                method: 'GET',
                url: `${appUrl}/api/agent/cards/<cardId>/comments`,
                headers: { Authorization: 'Bearer <agentToken>' },
                description: 'List all comments on a card, ordered by creation time.',
              },
              assignCard: {
                method: 'PUT',
                url: `${appUrl}/api/agent/cards/<cardId>/assign`,
                headers: {
                  Authorization: 'Bearer <agentToken>',
                  'Content-Type': 'application/json',
                },
                body: {
                  agentId: '<BoardAccess ID of target agent, or null to unassign>',
                },
                description: 'Assign or reassign a card to another approved agent on the board. Use GET /api/agent/agents to find agent IDs. Pass null to unassign.',
              },
            },
          },
        ],
      },
    });
  } catch (error) {
    console.error('Error in join-info:', error);
    return NextResponse.json(
      { error: 'Failed to get join info' },
      { status: 500 }
    );
  }
}
