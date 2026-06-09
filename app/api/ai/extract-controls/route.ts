import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/helpers';
import { createOpenAI } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';

export const runtime = 'nodejs';

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || '',
});

const controlSchema = z.object({
  controls: z.array(
    z.discriminatedUnion('type', [
      z.object({
        type: z.literal('range'),
        id: z.string().describe('Unique identifier, e.g. "price" or "walkDistance"'),
        label: z.string().describe('Human-readable label, e.g. "Price Range (¥)"'),
        min: z.number().describe('Minimum value'),
        max: z.number().describe('Maximum value'),
        step: z.number().describe('Step increment'),
        value: z.number().describe('Suggested default value based on the prompt'),
        unit: z.string().optional().describe('Unit suffix like "min", "km", "¥", "$"'),
      }),
      z.object({
        type: z.literal('toggle'),
        id: z.string().describe('Unique identifier, e.g. "freeWifi"'),
        label: z.string().describe('Human-readable label, e.g. "Free WiFi"'),
        value: z.boolean().describe('Whether this is enabled based on the prompt'),
      }),
      z.object({
        type: z.literal('select'),
        id: z.string().describe('Unique identifier, e.g. "roomType"'),
        label: z.string().describe('Human-readable label, e.g. "Room Type"'),
        options: z.array(z.string()).describe('Available options'),
        value: z.string().describe('Selected option based on the prompt'),
      }),
    ])
  ),
});

export async function POST(request: NextRequest) {
  try {
    await verifyAuth(request);

    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 5) {
      return NextResponse.json(
        { error: 'Prompt must be at least 5 characters' },
        { status: 400 }
      );
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'AI not configured — OPENROUTER_API_KEY env var is missing' },
        { status: 503 }
      );
    }

    const { object } = await generateObject({
      model: openrouter('openai/gpt-4.1-mini'),
      system: `You extract UI control parameters from user prompts for a hotel/travel search application.

Given a natural language prompt, identify extractable parameters and return them as UI controls:
- Use "range" type for numeric values like price, distance, duration, rating
- Use "toggle" type for boolean preferences like "free wifi", "breakfast included", "pet friendly"
- Use "select" type for categorical choices like room type, star rating, transport mode

Guidelines:
- Infer reasonable min/max ranges from context (e.g. "mid range" → price slider centered around mid-tier)
- "walking distance" → range slider 1-30 minutes, default around 10
- "budget" → price range with lower values; "luxury" → higher range
- Only extract parameters that are actually mentioned or strongly implied
- Use sensible units and step sizes
- Keep labels concise`,
      prompt: prompt.trim().slice(0, 2000),
      schema: controlSchema,
      temperature: 0.2,
    });

    return NextResponse.json(object);
  } catch (error) {
    console.error('Error in extract-controls:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to extract controls' },
      { status: 500 }
    );
  }
}
