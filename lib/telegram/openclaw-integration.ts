import { prisma } from '@/lib/db/prisma';
import { OpenClawHTTPAdapter } from '@/lib/openclaw/http-adapter';

export interface AgentIntegrationResult {
  success: boolean;
  response?: string;
  error?: string;
}

/**
 * Send task to OpenClaw agent and get response
 */
export async function sendTaskToAgent(
  boardId: string,
  agentId: string,
  taskDescription: string,
  onChunk?: (chunk: string) => void
): Promise<AgentIntegrationResult> {
  try {
    // Get OpenClaw connection for the board
    const openClawConnection = await prisma.openClawConnection.findUnique({
      where: { boardId },
    });

    if (!openClawConnection || !openClawConnection.enabled) {
      return {
        success: false,
        error: 'OpenClaw connection not configured or disabled for this board',
      };
    }

    const config = {
      gatewayUrl: openClawConnection.gatewayUrl,
      apiKey: openClawConnection.apiKey || undefined,
    };

    // Prepare messages
    const messages = [
      {
        role: 'user',
        content: taskDescription,
      },
    ];

    // Send message with streaming
    const response = await OpenClawHTTPAdapter.sendChatMessage(
      config,
      agentId,
      messages,
      true
    ) as AsyncIterable<any>;

    let fullContent = '';

    for await (const chunk of response) {
      const delta = chunk.choices?.[0]?.delta;
      if (delta?.content) {
        fullContent += delta.content;

        // Call callback if provided for real-time updates
        if (onChunk) {
          onChunk(delta.content);
        }
      }

      // Check if stream is complete
      if (chunk.choices?.[0]?.finish_reason) {
        break;
      }
    }

    return {
      success: true,
      response: fullContent,
    };
  } catch (error) {
    console.error('Error sending task to agent:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to communicate with agent',
    };
  }
}

/**
 * Find agent by ID or get default for board
 */
export async function findAgentForBoard(
  boardId: string,
  agentId?: string
): Promise<{ id: string; openClawId: string } | null> {
  try {
    if (agentId) {
      const agent = await prisma.agentConfig.findUnique({
        where: { id: agentId },
      });

      if (agent && agent.enabled) {
        return {
          id: agent.id,
          openClawId: agent.openClawId,
        };
      }
    }

    // Find any enabled agent for the board
    const agents = await prisma.agentConfig.findMany({
      where: {
        ownerId: boardId,
        enabled: true,
      },
      take: 1,
    });

    if (agents.length > 0) {
      return {
        id: agents[0].id,
        openClawId: agents[0].openClawId,
      };
    }

    return null;
  } catch (error) {
    console.error('Error finding agent:', error);
    return null;
  }
}

/**
 * Send task to board's default agent
 */
export async function sendTaskToBoardAgent(
  boardId: string,
  taskDescription: string,
  onChunk?: (chunk: string) => void
): Promise<AgentIntegrationResult> {
  const agent = await findAgentForBoard(boardId);

  if (!agent) {
    return {
      success: false,
      error: 'No agent configured for this board. Please set up an OpenClaw agent in your board settings.',
    };
  }

  return sendTaskToAgent(boardId, agent.id, taskDescription, onChunk);
}
