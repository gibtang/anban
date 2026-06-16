import { NextResponse } from 'next/server';

// IMPORTANT: read these from SERVER-ONLY (non-NEXT_PUBLIC) env vars.
// NEXT_PUBLIC_* vars are inlined at BUILD time by Next.js, so a value missing
// at build gets baked in as "" and survives runtime/restart. Non-public vars
// are resolved at RUNTIME, so changing them only needs a server restart
// (no rebuild). We fall back to the legacy NEXT_PUBLIC_* names for backward
// compatibility with deployments that still set those.
function pick(server: string | undefined, legacy: string | undefined) {
  // empty string counts as "not set" — config values are never legitimately empty
  return server && server.trim() ? server : legacy;
}

export async function GET() {
  const apiKey = pick(process.env.FIREBASE_API_KEY, process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
  const authDomain = pick(process.env.FIREBASE_AUTH_DOMAIN, process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN);
  const projectId = pick(process.env.FIREBASE_PROJECT_ID, process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);

  if (!apiKey || !authDomain || !projectId) {
    const missing = [
      !apiKey && 'FIREBASE_API_KEY',
      !authDomain && 'FIREBASE_AUTH_DOMAIN',
      !projectId && 'FIREBASE_PROJECT_ID',
    ].filter(Boolean) as string[];

    return NextResponse.json(
      {
        error: 'Firebase web client config is not configured on the server.',
        missing,
        hint: 'Set the listed env vars and restart the app. (Restart is enough — no rebuild required.)',
      },
      { status: 503 }
    );
  }

  return NextResponse.json({ apiKey, authDomain, projectId });
}
