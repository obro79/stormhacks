import { NextRequest, NextResponse } from 'next/server';
import { deleteAllSandboxes } from '@/lib/daytona';

/**
 * Admin endpoint: delete every Daytona sandbox on the account.
 * Requires `Authorization: Bearer $CLEANUP_TOKEN`, and is disabled when CLEANUP_TOKEN is unset.
 */
export async function POST(request: NextRequest) {
  const token = process.env.CLEANUP_TOKEN;

  if (!token || request.headers.get('authorization') !== `Bearer ${token}`) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

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
