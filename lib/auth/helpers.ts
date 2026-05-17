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

  return user.id;
}

export interface AgentAuthResult {
  boardId: string;
  agentName: string;
}

/**
 * Verify agent token from Authorization header
 * Returns boardId and agentName if valid
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

  const accessRequest = await prisma.boardAccess.findFirst({
    where: {
      agentToken: token,
      status: 'approved',
    },
  });

  if (!accessRequest) {
    throw new Error('Unauthorized: Invalid or revoked token');
  }

  return {
    boardId: accessRequest.boardId,
    agentName: accessRequest.agentName,
  };
}
