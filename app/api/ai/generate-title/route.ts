import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/helpers';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

export const runtime = 'nodejs';

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || '',
});

export async function POST(request: NextRequest) {
  try {
    await verifyAuth(request);

    const { description } = await request.json();

    if (!description || typeof description !== 'string' || description.trim().length < 10) {
      return NextResponse.json(
        { error: 'Description must be at least 10 characters' },
        { status: 400 }
      );
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'AI title generation not configured' },
        { status: 503 }
      );
    }

    const { text: title } = await generateText({
      model: openrouter('openai/gpt-4.1-mini'),
      system:
        'You generate concise ticket titles for a kanban board. Given a description, return ONLY the title — no quotes, no prefix, no explanation. Maximum 80 characters. Use imperative mood (e.g. "Fix login redirect loop", "Add dark mode toggle"). Be specific, not vague.',
      prompt: description.trim().slice(0, 2000),
      maxOutputTokens: 40,
      temperature: 0.3,
    });

    const trimmed = title.trim();
    if (!trimmed) {
      return NextResponse.json(
        { error: 'Empty response from AI' },
        { status: 502 }
      );
    }

    return NextResponse.json({ title: trimmed });
  } catch (error) {
    console.error('Error in generate-title:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to generate title' },
      { status: 500 }
    );
  }
}
