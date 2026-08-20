import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyIdToken } from '@/lib/firebase/admin';
import { notifyNewRegistration } from '@/lib/notifications/registration';

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

  // Get or create user by Firebase UID. findFirst-then-create (instead of
  // upsert) so we know exactly when the user was created in THIS request —
  // upsert cannot tell "created" from "already existed", which would risk
  // duplicate registration notifications for rapid first-session requests.
  let user = await prisma.user.findUnique({ where: { firebaseUid } });
  const isNewUser = !user;
  if (!user) {
    try {
      user = await prisma.user.create({
        data: {
          firebaseUid,
          email: decodedToken.email || firebaseUid,
        },
      });
    } catch (error) {
      // P2002 = a concurrent first request already created the user
      if ((error as { code?: string }).code === 'P2002') {
        user = await prisma.user.findUniqueOrThrow({ where: { firebaseUid } });
      } else {
        throw error;
      }
    }
  }

  // Auto-create default board for brand-new users (guarded in case a
  // previous partial signup already created one)
  if (isNewUser) {
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

    // Best-effort welcome email + Telegram registration alert.
    // Fire-and-forget: never blocks or fails the authenticated request.
    void notifyNewRegistration({ email: user.email, userId: user.id });
  }

  return user.id;
}

export interface AgentAuthResult {
  agentId: string;
  agentName: string;
  ownerId: string | null;
}

/**
 * Verify agent token from Authorization header (account-level)
 * Returns agent identity — callers no longer need board-level checks
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

  // Track last access asynchronously (fire-and-forget)
  prisma.agent.update({
    where: { id: agent.id },
    data: { lastAccessAt: new Date() },
  }).catch(() => {}); // ignore errors

  return {
    agentId: agent.id,
    agentName: agent.name,
    ownerId: agent.ownerId,
  };
}

const SKILL_MD_URL = 'https://www.getanban.com/skill.md';
const SKILL_MD_POINTER = `Read the skill.md for API access and troubleshooting: ${SKILL_MD_URL}`;

/**
 * True when an error was thrown by verifyAuth/verifyAgentAuth (their
 * messages all start with "Unauthorized").
 */
export function isUnauthorizedError(error: unknown): error is Error {
  return error instanceof Error && error.message.startsWith('Unauthorized');
}

/**
 * Build the canonical 401 response. Every API 401 points the caller at
 * the skill.md so agents can self-troubleshoot access problems.
 * `detail` may be a raw thrown message; a leading "Unauthorized:" is
 * stripped so it is not repeated.
 */
export function unauthorizedResponse(detail?: string): NextResponse {
  const stripped = detail?.replace(/^Unauthorized:?\s*/, '').trim();
  const base = stripped ? `Unauthorized: ${stripped}. ` : 'Unauthorized. ';
  return NextResponse.json({ error: `${base}${SKILL_MD_POINTER}` }, { status: 401 });
}
