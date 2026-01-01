import { NextRequest, NextResponse } from 'next/server';
import { filesStore } from '@/lib/filesStore';

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json(
      { success: false, error: 'Session ID is required' },
      { status: 400 }
    );
  }

  const files = filesStore.get(sessionId) || [];

  if (!files || files.length === 0) {
    return NextResponse.json(
      { success: false, error: 'No files found for this session' },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, files });
}


