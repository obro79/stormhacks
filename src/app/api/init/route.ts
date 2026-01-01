import { NextRequest, NextResponse } from 'next/server';
import { buildApp } from '@/lib/orchestrator';
import { BuildRequest } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body: BuildRequest = await request.json();

    if (!body.prompt || typeof body.prompt !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Prompt is required and must be a string' },
        { status: 400 }
      );
    }

    const result = await buildApp(body.prompt);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in /api/init:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
