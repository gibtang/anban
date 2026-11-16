import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/firebase/verify';
import { notifyNewRegistration } from '@/lib/notifications/registration';
import { agents, boards, columns, users, toId } from '@/lib/db/mongo';

/**
 * Verify authentication and return user ID
 * Respects DISABLE_AUTH environment variable for local development
 */
export async function verifyAuth(request: NextRequest): Promise<string> {
  const authDisabled = process.env.DISABLE_AUTH === 'true';

  if (authDisabled) {
    // Dev convenience: reuse (or lazily create) a single deterministic dev user.
    const devUid = 'local-dev-user';
    const user = await users.findOne({ firebaseUid: devUid });
    if (user) {
      return user.id;
    }
    return users.insertOne({
      firebaseUid: devUid,
      email: 'dev@localhost',
      shareToken: null,
      onboardingCompleted: false,
      lastFeedSeenAt: null,
      createdAt: new Date(),
    });
  }

  const token = request.cookies.get('firebase-auth-token')?.value;
  if (!token) {
    throw new Error('Unauthorized');
  }

  let firebaseUid: string;
  let email: string | null;
  try {
    const decoded = await verifyIdToken(token);
    firebaseUid = decoded.uid;
    email = decoded.email;
  } catch (error) {
    // Firebase throws auth/id-token-expired and auth/argument-error for stale,
    // malformed, or revoked raw ID tokens. API routes already map the app's
    // Unauthorized error to 401; normalize here so an expired session never
    // gets mislabeled as a server-side 500.
    console.info('Firebase ID token rejected:', error instanceof Error ? error.message : error);
    throw new Error('Unauthorized');
  }

  // Get or create user by Firebase UID. find-then-create (instead of
  // upsert) so we know exactly when the user was created in THIS request —
  // upsert cannot tell "created" from "already existed", which would risk
  // duplicate registration notifications for rapid first-session requests.
  let user = await users.findOne({ firebaseUid });
  const isNewUser = !user;
  if (!user) {
    user = {
      id: await users.insertOne({
        firebaseUid,
        email: email || firebaseUid,
        shareToken: null,
        onboardingCompleted: false,
        lastFeedSeenAt: null,
        createdAt: new Date(),
      }),
      firebaseUid,
      email: email || firebaseUid,
      shareToken: null,
      onboardingCompleted: false,
      lastFeedSeenAt: null,
      createdAt: new Date(),
    };
  }
  const userId = user.id;

  // Auto-create default board for brand-new users (guarded in case a
  // previous partial signup already created one)
  if (isNewUser) {
    const existingBoards = await boards.count({ ownerId: toId(userId) });

    if (existingBoards === 0) {
      const now = new Date();
      const boardId = await boards.insertOne({
        name: 'My Board',
        ownerId: toId(userId),
        favorited: false,
        archived: false,
        createdAt: now,
        updatedAt: now,
      });
      const defaults = [
        { name: 'To Do', position: 0 },
        { name: 'In Progress', position: 1 },
        { name: 'Done', position: 2 },
      ];
      for (const col of defaults) {
        await columns.insertOne({ boardId: toId(boardId), name: col.name, position: col.position, createdAt: new Date() });
      }
    }

    // Best-effort welcome email + Telegram registration alert.
    // Fire-and-forget: never blocks or fails the authenticated request.
    void notifyNewRegistration({ email: user.email, userId });
  }

  return userId;
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

  const agent = await agents.findOne({ token });

  if (!agent) {
    throw new Error('Unauthorized: Invalid or revoked token');
  }

  // Track last access asynchronously (fire-and-forget)
  agents.updateOne({ _id: toId(agent.id) }, { $set: { lastAccessAt: new Date() } }).catch(() => {}); // ignore errors

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
