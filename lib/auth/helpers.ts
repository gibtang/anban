import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyIdToken } from '@/lib/firebase/admin';

/**
 * Verify authentication and return user ID
 * Respects DISABLE_AUTH environment variable for local development
 */
export async function verifyAuth(request: NextRequest): Promise<string> {
  const authDisabled = process.env.DISABLE_AUTH === 'true';

  if (authDisabled) {
    // Return mock user ID for development
    const mockUser = await prisma.user.upsert({
      where: { firebaseUid: 'dev-user' },
      update: {},
      create: {
        firebaseUid: 'dev-user',
        email: 'dev@localhost',
      },
    });
    return mockUser.id;
  }

  const token = request.cookies.get('firebase-auth-token')?.value;
  if (!token) {
    throw new Error('Unauthorized');
  }

  const decodedToken = await verifyIdToken(token);
  const firebaseUid = decodedToken.uid;

  // Get or create user by Firebase UID
  const user = await prisma.user.upsert({
    where: { firebaseUid },
    update: {},
    create: {
      firebaseUid,
      email: decodedToken.email || firebaseUid,
    },
  });

  // Auto-create default board only for brand-new users
  // Use createdAt to detect if user was just created (within last 5 seconds)
  const justCreated = Date.now() - user.createdAt.getTime() < 5000;

  if (justCreated) {
    const existingBoards = await prisma.board.count({
      where: { ownerId: user.id },
    });

    if (existingBoards === 0) {
      await prisma.board.create({
        data: {
          name: 'My Board',
          ownerId: user.id,
          columns: {
            create: [
              { name: 'To Do', position: 0 },
              { name: 'In Progress', position: 1 },
              { name: 'Done', position: 2 },
            ],
          },
        },
      });
    }
  }

  return user.id;
}

export interface AgentAuthResult {
  agentId: string;
  agentName: string;
}

/**
 * Verify agent token from Authorization header (account-level)
 * Returns agent identity only — callers must check board access separately
 */
export async function verifyAgentAuth(request: NextRequest): Promise<AgentAuthResult> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Unauthorized: Missing Bearer token');
  }

  const token = authHeader.slice(7);
  if (!token) {
    throw new Error('Unauthorized: Empty token');
  }

  const agent = await prisma.agent.findUnique({
    where: { token },
  });

  if (!agent) {
    throw new Error('Unauthorized: Invalid or revoked token');
  }

  return {
    agentId: agent.id,
    agentName: agent.name,
  };
}

/**
 * Verify that an agent has approved access to a specific board
 */
export async function verifyAgentBoardAccess(agentId: string, boardId: string): Promise<void> {
  const access = await prisma.boardAccess.findFirst({
    where: {
      agentId,
      boardId,
      status: 'approved',
    },
  });

  if (!access) {
    throw new Error('Forbidden: No access to this board');
  }
}
