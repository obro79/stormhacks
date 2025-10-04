import { NextRequest, NextResponse } from 'next/server';
import { buildApp } from '@/lib/orchestrator';
import { BuildRequest } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    console.log('📥 API /api/init received request');
    const body: BuildRequest = await request.json();

    if (!body.prompt || typeof body.prompt !== 'string') {
      console.log('❌ Invalid prompt received');
      return NextResponse.json(
        { success: false, message: 'Prompt is required and must be a string' },
        { status: 400 }
      );
    }

    console.log('✅ Prompt parsed:', body.prompt);
    console.log('🔧 Calling buildApp function...');

    const result = await buildApp(body.prompt);

    console.log('✅ buildApp completed:', result.success);
    if (result.sandboxUrl) {
      console.log('🔗 View link:', result.sandboxUrl);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ Error in /api/init:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
