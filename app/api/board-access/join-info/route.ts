import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const runtime = 'nodejs';

/**
 * Public endpoint: returns machine-readable join instructions for AI agents.
 *
 * Called with: GET /api/board-access/join-info?shareToken=<token>
 *
 * Now resolves User.shareToken (account-level) instead of Board.shareToken
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

    // Look up user by account-level share token
    const user = await prisma.user.findUnique({
      where: { shareToken },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired share link' },
        { status: 404 }
      );
    }

    // Get all boards owned by this user
    const boards = await prisma.board.findMany({
      where: { ownerId: user.id },
      select: { id: true, name: true },
      orderBy: { createdAt: 'asc' },
    }) as { id: string; name: string }[];

    if (boards.length === 0) {
      return NextResponse.json(
        { error: 'No boards found for this account' },
        { status: 404 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const boardNames = boards.map(b => b.name).join(', ');

    return NextResponse.json({
      type: 'anban-account-join',
      boards: boards.map(b => ({ id: b.id, name: b.name })),
      shareToken,
      instructions: {
        summary: `You are invited to join all boards (${boardNames}) on Anban (a kanban board). Follow these steps to get access.`,
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
            description: 'Send your agent name to request access to this account. Use a descriptive name like "Research Bot" or "Task Manager".',
            response: {
              approvalToken: '<string>',
              status: 'pending',
              approvalUrl: '<string — send this URL back to the account owner>',
              message: '<string>',
            },
          },
          {
            step: 2,
            action: 'Notify account owner',
            description: 'Send the approvalUrl from step 1 back to the person who shared this link with you. They must click it to approve your access.',
          },
          {
            step: 3,
            action: 'Poll for approval',
            method: 'GET',
            url: `${appUrl}/api/board-access/<approvalToken>`,
            description: 'Poll this endpoint every 3-5 seconds until status changes from "pending" to "approved" or "denied". The request expires after 3 minutes — if it expires, repeat from step 1.',
            response: {
              status: '<pending|approved|denied|expired>',
              agentToken: '<string — only present when approved>',
            },
          },
          {
            step: 4,
            action: 'Discover your boards',
            method: 'GET',
            url: `${appUrl}/api/agent/boards`,
            headers: { Authorization: 'Bearer <agentToken>' },
            description: 'List all boards you have access to. Returns board IDs and names. Use boardId in subsequent API calls.',
          },
          {
            step: 5,
            action: 'Use the board API',
            description: 'Once approved, use the agentToken as a Bearer token to interact with boards. All endpoints require a boardId parameter.',
            endpoints: {
              readBoard: {
                method: 'GET',
                url: `${appUrl}/api/agent/board?boardId=<boardId>`,
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
                  boardId: '<boardId>',
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
                  boardId: '<boardId>',
                  title: '<optional new title>',
                  description: '<optional new description>',
                  columnId: '<optional new column ID to move card>',
                },
                description: 'Update a card (move between columns, change title/description).',
              },
              listAgents: {
                method: 'GET',
                url: `${appUrl}/api/agent/agents?boardId=<boardId>`,
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
                  boardId: '<boardId>',
                  content: '<comment text, max 2000 chars>',
                },
                description: 'Add a comment to a card. Your agent name is automatically recorded as the author.',
              },
              listComments: {
                method: 'GET',
                url: `${appUrl}/api/agent/cards/<cardId>/comments?boardId=<boardId>`,
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
                  boardId: '<boardId>',
                  agentId: '<Agent ID of target agent, or null to unassign>',
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
