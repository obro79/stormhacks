import { NextRequest, NextResponse } from "next/server";
import { deployToGitHubAndVercel } from "@/lib/deployHelpers";
import { filesStore } from '@/lib/filesStore';
import { isValidSessionId } from '@/lib/validation';

/**
 * Deploy a generated app: push its files to a new GitHub repo, then ship it to Vercel.
 */
export async function POST(request: NextRequest) {
  let sessionId: unknown;
  let projectPrompt: unknown;
  try {
    ({ sessionId, projectPrompt } = await request.json());
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  if (!isValidSessionId(sessionId)) {
    return NextResponse.json(
      { success: false, error: 'Invalid session ID format' },
      { status: 400 }
    );
  }

  const files = filesStore.get(sessionId);

  if (!files || files.length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: "No files found for this sandbox session. Make sure the app was built successfully."
      },
      { status: 404 }
    );
  }

  const result = await deployToGitHubAndVercel(
    files,
    typeof projectPrompt === 'string' ? projectPrompt : undefined
  );

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: result.error || "Deployment failed",
        githubUrl: result.githubUrl, // May have GitHub URL even if Vercel failed
        repoName: result.repoName,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: result.message,
    deploymentUrl: result.deploymentUrl,
    githubUrl: result.githubUrl,
    repoName: result.repoName,
    filesDeployed: files.length,
  });
}
