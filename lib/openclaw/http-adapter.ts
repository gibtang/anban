import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionChunk,
  OpenClawConnectionConfig,
} from "./types";

/**
 * HTTP adapter for OpenClaw's OpenAI-compatible API
 * Handles chat-only interactions
 */
export class OpenClawHTTPAdapter {
  /**
   * Check if OpenClaw gateway is healthy
   */
  static async healthCheck(config: OpenClawConnectionConfig): Promise<boolean> {
    try {
      const headers: Record<string, string> = {};

      // Support both Bearer token and raw auth token
      if (config.apiKey) {
        headers["Authorization"] = config.apiKey.startsWith('Bearer ')
          ? config.apiKey
          : `Bearer ${config.apiKey}`;
      }

      const response = await fetch(`${config.gatewayUrl}/health`, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Send chat messages to OpenClaw agent
   * Supports both streaming and non-streaming modes
   */
  static async sendChatMessage(
    config: OpenClawConnectionConfig,
    agentId: string,
    messages: Array<{ role: string; content: string }>,
    stream = false
  ): Promise<ChatCompletionResponse | AsyncIterable<ChatCompletionChunk>> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Support both Bearer token and raw auth token
    if (config.apiKey) {
      headers["Authorization"] = config.apiKey.startsWith('Bearer ')
        ? config.apiKey
        : `Bearer ${config.apiKey}`;
    }

    const response = await fetch(`${config.gatewayUrl}/v1/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: agentId,
        messages,
        stream,
      }),
      signal: AbortSignal.timeout(60000), // 60 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `OpenClaw API error: ${response.status} ${response.statusText}\n${errorText}`
      );
    }

    if (stream) {
      return this.createStreamIterator(response);
    }

    const data = (await response.json()) as ChatCompletionResponse;
    return data;
  }

  /**
   * Create async iterable for streaming responses
   */
  private static async *createStreamIterator(
    response: Response
  ): AsyncIterable<ChatCompletionChunk> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Response body is not readable");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === "data: [DONE]") {
            continue;
          }

          if (trimmed.startsWith("data: ")) {
            try {
              const jsonStr = trimmed.slice(6);
              const chunk = JSON.parse(jsonStr) as ChatCompletionChunk;
              yield chunk;
            } catch (error) {
              console.error("Failed to parse SSE chunk:", error);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
