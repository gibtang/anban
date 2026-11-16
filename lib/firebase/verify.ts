/**
 * Firebase ID token verification for Cloudflare Workers.
 *
 * Replaces firebase-admin's `verifyIdToken` (firebase-admin cannot run on
 * Workers: it depends on Node gRPC/OpenSSL internals). Verifies the Google
 * signed token directly with `jose` against Firebase's public JWKS:
 * issuer   https://securetoken.google.com/<projectId>
 * audience <projectId>
 * subject  = the user's firebase uid
 */
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

// createRemoteJWKSet resolves keys lazily; safe to build once at module scope.
const jwks = createRemoteJWKSet(new URL(JWKS_URL));

export interface FirebaseToken {
  uid: string;
  email: string | null;
}

export function getFirebaseProjectId(): string {
  // Prefer the non-public FIREBASE_PROJECT_ID (runtime-resolved); fall back to
  // the legacy NEXT_PUBLIC_ name for deployments that still set it.
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error('Firebase project is not configured. Please set FIREBASE_PROJECT_ID.');
  }
  return projectId;
}

export async function verifyIdToken(token: string): Promise<FirebaseToken> {
  const projectId = getFirebaseProjectId();
  let payload: JWTPayload;
  try {
    const result = await jwtVerify(token, jwks, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });
    payload = result.payload;
  } catch (error) {
    // Mirror the firebase-admin failure mode: any malformed, expired, or
    // wrong-project token is an auth failure, not a server error.
    throw new Error(`Invalid Firebase ID token: ${error instanceof Error ? error.message : error}`);
  }
  if (!payload.sub) {
    throw new Error('Invalid Firebase ID token: missing subject');
  }
  return {
    uid: payload.sub,
    email: typeof payload.email === 'string' ? payload.email : null,
  };
}
