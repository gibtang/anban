import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/firebase/admin';

export const runtime = 'nodejs';

interface TestConnectionRequest {
  gatewayUrl: string;
  apiKey?: string;
}

interface TestConnectionResponse {
  success: boolean;
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('firebase-auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decodedToken = await verifyIdToken(token);
    const firebaseUid = decodedToken.uid;

    if (!firebaseUid) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body: TestConnectionRequest = await request.json();
    const { gatewayUrl, apiKey } = body;

    if (!gatewayUrl || typeof gatewayUrl !== 'string' || gatewayUrl.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: 'Gateway URL is required' } as TestConnectionResponse,
        { status: 400 }
      );
    }

    // Validate URL format
    let validatedUrl: URL;
    try {
      validatedUrl = new URL(gatewayUrl.trim());
    } catch {
      return NextResponse.json(
        { success: false, message: 'Invalid gateway URL format' } as TestConnectionResponse,
        { status: 400 }
      );
    }

    // Test the connection by making a request to the OpenClaw gateway
    // For now, we'll do a simple health check or list agents request
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey && apiKey.trim() !== '******') {
      headers['Authorization'] = `Bearer ${apiKey.trim()}`;
    }

    try {
      // Try to fetch agents or health endpoint
      const testUrl = `${validatedUrl.origin}/api/agents`;
      const response = await fetch(testUrl, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (response.ok) {
        return NextResponse.json({
          success: true,
          message: 'Successfully connected to OpenClaw gateway',
        } as TestConnectionResponse);
      } else {
        return NextResponse.json({
          success: false,
          message: `Connection failed: ${response.status} ${response.statusText}`,
        } as TestConnectionResponse);
      }
    } catch (fetchError) {
      // If fetch fails, try a simpler health check
      try {
        const healthResponse = await fetch(validatedUrl.origin, {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
        });

        if (healthResponse.ok) {
          return NextResponse.json({
            success: true,
            message: 'Gateway is reachable (basic connectivity confirmed)',
          } as TestConnectionResponse);
        }
      } catch {
        // Both attempts failed
      }

      return NextResponse.json({
        success: false,
        message: 'Failed to connect to gateway. Please check the URL and your network connection.',
      } as TestConnectionResponse);
    }
  } catch (error) {
    console.error('Error testing connection:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed',
      } as TestConnectionResponse,
      { status: 500 }
    );
  }
}
