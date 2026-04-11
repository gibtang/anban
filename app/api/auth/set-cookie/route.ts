import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { idToken } = await request.json();

  const response = NextResponse.json({ success: true });

  response.cookies.set('firebase-auth-token', idToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 604800, // 7 days
    path: '/',
  });

  return response;
}