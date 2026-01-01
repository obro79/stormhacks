import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { filesStore } from '@/lib/filesStore';
import { FileChange } from '@/lib/types';

async function createZipResponse(files: FileChange[], sessionId: string): Promise<NextResponse> {
  const zip = new JSZip();

  files.forEach(file => {
    if (file.operation !== 'delete') {
      zip.file(file.path, file.content);
    }
  });

  const zipBuffer = await zip.generateAsync({ type: 'uint8array' });

  return new NextResponse(zipBuffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="echome-project-${sessionId}.zip"`,
      'Content-Length': zipBuffer.length.toString(),
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId || !/^[a-zA-Z0-9_-]{1,64}$/.test(sessionId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid sessionId format' },
        { status: 400 }
      );
    }

    const files = filesStore.get(sessionId);

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No files found for this session' },
        { status: 404 }
      );
    }

    return await createZipResponse(files, sessionId);

  } catch (error) {
    console.error('Error creating ZIP file:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create ZIP file',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId');

  if (!sessionId || !/^[a-zA-Z0-9_-]{1,64}$/.test(sessionId)) {
    return NextResponse.json(
      { success: false, error: 'Invalid sessionId format' },
      { status: 400 }
    );
  }

  const files = filesStore.get(sessionId);

  if (!files || files.length === 0) {
    return NextResponse.json(
      { success: false, error: 'No files found for this session' },
      { status: 404 }
    );
  }

  try {
    return await createZipResponse(files, sessionId);

  } catch (error) {
    console.error('Error creating ZIP file:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create ZIP file',
      },
      { status: 500 }
    );
  }
}
