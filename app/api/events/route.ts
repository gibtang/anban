import { NextRequest } from 'next/server';
import { eventBus } from '@/lib/events/event-bus';
import { verifyAuth } from '@/lib/auth/helpers';
import { prisma } from '@/lib/db/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const userId = await verifyAuth(request);

    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get('boardId');

    if (!boardId) {
      return new Response('boardId query parameter is required', { status: 400 });
    }

    // Verify board ownership
    const board = await prisma.board.findFirst({
      where: {
        id: boardId,
        ownerId: userId,
      },
    });

    if (!board) {
      return new Response('Board not found', { status: 404 });
    }

    const encoder = new TextEncoder();

    // Create a readable stream for SSE
    const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const data = `data: ${JSON.stringify({ type: 'connected', boardId })}\n\n`;
      controller.enqueue(encoder.encode(data));

      // Subscribe to board-specific events
      const boardEventHandler = (event: any) => {
        const eventData = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(eventData));
      };

      eventBus.on(`board:${boardId}`, boardEventHandler);

      // Set up heartbeat every 30 seconds
      const heartbeatInterval = setInterval(() => {
        const heartbeat = `: heartbeat\n\n`;
        try {
          controller.enqueue(encoder.encode(heartbeat));
        } catch (error) {
          // Connection closed, stop heartbeat
          clearInterval(heartbeatInterval);
        }
      }, 30000);

      // Clean up on connection close
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval);
        eventBus.off(`board:${boardId}`, boardEventHandler);
        controller.close();
      });
    },
  });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      },
    });
  } catch (error) {
    console.error('Error in SSE endpoint:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return new Response('Unauthorized', { status: 401 });
    }
    return new Response('Authentication failed', { status: 401 });
  }
}
