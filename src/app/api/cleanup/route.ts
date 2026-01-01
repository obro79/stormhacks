import { NextResponse } from 'next/server';
import { deleteAllSandboxes } from '@/lib/daytona';

export async function GET() {
  try {
    const result = await deleteAllSandboxes();

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${result.deleted} sandbox(es)`,
      deleted: result.deleted,
      sandboxIds: result.ids
    });
  } catch (error) {
    console.error('Error in cleanup API:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cleanup sandboxes',
      },
      { status: 500 }
    );
  }
}
