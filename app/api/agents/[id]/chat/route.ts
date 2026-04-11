import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyIdToken } from '@/lib/firebase/admin';
import { OpenClawHTTPAdapter } from '@/lib/openclaw/http-adapter';
import { eventBus } from '@/lib/events/event-bus';
import { logAuditEvent } from '@/lib/db/audit';

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface ChatRequest {
  messages: Array<{ role: string; content: string }>;
  stream?: boolean;
  boardId?: string;
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function appendAgentResponseToCards(agentId: string, boardId: string, response: string) {
  try {
    // Find all cards on this board assigned to this agent
    const cards = await prisma.card.findMany({
      where: {
        boardId,
        agentId,
      },
    });

    if (cards.length === 0) {
      console.log(`No cards found for agent ${agentId} on board ${boardId}`);
      return;
    }

    console.log(`Appending agent response to ${cards.length} card(s)`);

    const timestamp = new Date().toISOString();
    const responseBlock = `\n\n--- Agent Response (${timestamp}) ---\n${response}`;

    // Update each card
    for (const card of cards) {
      const oldDescription = card.description || '';
      const newDescription = oldDescription + responseBlock;

      const updatedCard = await prisma.card.update({
        where: { id: card.id },
        data: {
          description: newDescription,
        },
      });

      // Emit card.updated event for real-time updates
      eventBus.emitEvent({
        type: 'card.updated',
        boardId,
        cardId: card.id,
      });

      // Log audit event (use system user or board owner)
      await logAuditEvent({
        userId: card.boardId, // Using boardId as userId placeholder for system actions
        action: 'UPDATE',
        entityType: 'Card',
        entityId: card.id,
        oldValues: { description: oldDescription },
        newValues: { description: newDescription },
      });

      console.log(`Updated card ${card.id} with agent response`);
    }
  } catch (error) {
    console.error('Error appending agent response to cards:', error);
    // Don't throw - allow chat to succeed even if card update fails
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const token = request.cookies.get('firebase-auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await verifyIdToken(token);

    const { id: agentId } = await context.params;
    const body = await request.json() as ChatRequest;
    const { messages, stream = false, boardId } = body;

    // Validation
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    for (const msg of messages) {
      if (!msg.role || typeof msg.role !== 'string') {
        return NextResponse.json({ error: 'Each message must have a role' }, { status: 400 });
      }
      if (!msg.content || typeof msg.content !== 'string') {
        return NextResponse.json({ error: 'Each message must have content' }, { status: 400 });
      }
    }

    // Look up agent config by ID
    const agent = await prisma.agentConfig.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    if (!agent.enabled) {
      return NextResponse.json({ error: 'Agent is disabled' }, { status: 400 });
    }

    // Look up OpenClaw connection settings from board
    if (!boardId) {
      return NextResponse.json({ error: 'boardId is required' }, { status: 400 });
    }

    const openClawConnection = await prisma.openClawConnection.findUnique({
      where: { boardId },
    });

    if (!openClawConnection || !openClawConnection.enabled) {
      return NextResponse.json({ error: 'OpenClaw connection not configured or disabled' }, { status: 400 });
    }

    const config = {
      gatewayUrl: openClawConnection.gatewayUrl,
      apiKey: openClawConnection.apiKey || undefined,
    };

    // Handle streaming response
    if (stream) {
      const encoder = new TextEncoder();

      const streamResponse = new ReadableStream({
        async start(controller) {
          try {
            const response = await OpenClawHTTPAdapter.sendChatMessage(
              config,
              agent.openClawId,
              messages,
              true
            ) as AsyncIterable<any>;

            let fullContent = '';
            let messageId = '';

            for await (const chunk of response) {
              const delta = chunk.choices?.[0]?.delta;
              if (delta?.content) {
                fullContent += delta.content;

                if (!messageId && chunk.id) {
                  messageId = chunk.id;
                }

                // Forward SSE chunk to client
                const data = `data: ${JSON.stringify(chunk)}\n\n`;
                controller.enqueue(encoder.encode(data));
              }

              // Check if stream is complete
              if (chunk.choices?.[0]?.finish_reason) {
                // Emit agent.message event to EventBus
                eventBus.emitEvent({
                  type: 'agent.message',
                  boardId,
                  agentId,
                  messageId: messageId || agentId,
                });

                // Append agent response to assigned cards
                await appendAgentResponseToCards(agentId, boardId, fullContent);

                // Send final chunk
                const doneData = 'data: [DONE]\n\n';
                controller.enqueue(encoder.encode(doneData));
                controller.close();
                break;
              }
            }
          } catch (error) {
            console.error('Error streaming from OpenClaw:', error);
            const errorData = `data: ${JSON.stringify({ error: 'Stream error' })}\n\n`;
            controller.enqueue(encoder.encode(errorData));
            controller.close();
          }
        },
      });

      return new Response(streamResponse, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      });
    }

    // Handle non-streaming response
    const response = await OpenClawHTTPAdapter.sendChatMessage(
      config,
      agent.openClawId,
      messages,
      false
    ) as any;

    // Emit agent.message event to EventBus
    eventBus.emitEvent({
      type: 'agent.message',
      boardId,
      agentId,
      messageId: response.id || agentId,
    });

    // Append agent response to assigned cards
    const content = response.choices?.[0]?.message?.content || response.content || '';
    if (content) {
      await appendAgentResponseToCards(agentId, boardId, content);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in agent chat:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send message to agent' },
      { status: 500 }
    );
  }
}
