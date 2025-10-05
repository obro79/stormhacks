import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { filesStore } from '@/lib/filesStore';

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { success: false, message: 'Session ID is required' },
        { status: 400 }
      );
    }

    const files = filesStore.get(sessionId);
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No files found for this session' },
        { status: 404 }
      );
    }

    // Create ZIP file
    const zip = new JSZip();
    
    // Add all files to the ZIP
    files.forEach(file => {
      if (file.operation !== 'delete') {
        zip.file(file.path, file.content);
      }
    });

    // Generate ZIP buffer as Uint8Array for NextResponse compatibility
    const zipBuffer = await zip.generateAsync({ type: 'uint8array' });

    // Return ZIP file - cast to BodyInit for type safety
    return new NextResponse(zipBuffer as BodyInit, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="dayton-sandbox-code-${sessionId}.zip"`,
        'Content-Length': zipBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('❌ Error creating ZIP file:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create ZIP file',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json(
      { success: false, message: 'Session ID is required' },
      { status: 400 }
    );
  }

  const files = filesStore.get(sessionId);
  
  if (!files || files.length === 0) {
    return NextResponse.json(
      { success: false, message: 'No files found for this session' },
      { status: 404 }
    );
  }

  try {
    // Create ZIP file
    const zip = new JSZip();
    
    // Add all files to the ZIP
    files.forEach(file => {
      if (file.operation !== 'delete') {
        zip.file(file.path, file.content);
      }
    });

    // Generate ZIP buffer as Uint8Array for NextResponse compatibility
    const zipBuffer = await zip.generateAsync({ type: 'uint8array' });

    // Return ZIP file - cast to BodyInit for type safety
    return new NextResponse(zipBuffer as BodyInit, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="dayton-sandbox-code-${sessionId}.zip"`,
        'Content-Length': zipBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('❌ Error creating ZIP file:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create ZIP file',
      },
      { status: 500 }
    );
  }
}
