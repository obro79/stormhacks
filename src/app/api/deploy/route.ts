import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import crypto from "node:crypto";
import {
  deploySandboxFiles,
  cleanupOldDeployments,
  deployToGitHubAndVercel
} from "@/lib/deployHelpers";
import { filesStore } from '@/lib/filesStore';

const execAsync = promisify(exec);

// Suppress unused import warning - crypto is used for potential future functionality
void crypto;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { commitMessage, deployType = "github-vercel", sessionId, sandboxId, projectPrompt } = body;

    console.log("🚀 Starting deployment...", {
      commitMessage,
      deployType,
      sessionId,
      sandboxId,
      projectPrompt,
      isSandboxDeploy: !!sessionId
    });

    // If sessionId is provided, deploy the sandbox files
    if (sessionId) {
      // Get files from store
      const files = filesStore.get(sessionId);

      if (!files || files.length === 0) {
        console.error(`❌ No files found for session ${sessionId}`);
        console.log('Available sessions:', Array.from(filesStore.keys()));
        return NextResponse.json(
          {
            success: false,
            error: "No files found for this sandbox session. Make sure the app was built successfully."
          },
          { status: 404 }
        );
      }

      console.log(`📁 Found ${files.length} files for session ${sessionId}`);

      // Choose deployment strategy based on deployType
      if (deployType === "github-vercel") {
        // NEW: Deploy to GitHub + Vercel (one-click)
        console.log("📦 Deploying to GitHub + Vercel...");
        const result = await deployToGitHubAndVercel(files, sessionId, projectPrompt);

        if (result.success) {
          return NextResponse.json({
            success: true,
            message: result.message,
            deploymentUrl: result.deploymentUrl,
            githubUrl: result.githubUrl,
            repoName: result.repoName,
            filesDeployed: files.length,
          });
        } else {
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
      } else {
        // OLD: Legacy Vercel-only deployment
        console.log("📦 Deploying sandbox files (legacy mode)...");
        const result = await deploySandboxFiles(files, sessionId);

        // Clean up old deployments (keep last 5)
        await cleanupOldDeployments(5);

        if (result.success) {
          return NextResponse.json({
            success: true,
            message: result.message,
            deploymentUrl: result.deploymentUrl,
            filesDeployed: files.length,
          });
        } else {
          return NextResponse.json(
            {
              success: false,
              error: result.error || "Deployment failed",
            },
            { status: 500 }
          );
        }
      }
    }

    // Otherwise, deploy the main stormhacks codebase (original functionality)
    let command = "";
    const message = commitMessage || `Deploy: ${new Date().toISOString()}`;

    // Determine which deployment command to run
    switch (deployType) {
      case "full":
        // Full deployment: commit, push, and deploy to Vercel
        command = `bash ${process.cwd()}/scripts/deploy.sh "${message}"`;
        break;

      case "quick":
        // Quick deployment: just commit and push
        command = "npm run deploy:quick";
        break;

      case "vercel":
        // Vercel only: deploy without git operations
        command = "npm run deploy:vercel";
        break;

      default:
        return NextResponse.json(
          { success: false, error: "Invalid deployment type" },
          { status: 400 }
        );
    }

    console.log("📝 Running command:", command);

    // Execute the deployment command
    const { stdout, stderr } = await execAsync(command, {
      cwd: process.cwd(),
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
    });

    console.log("✅ Deployment completed");
    console.log("stdout:", stdout);
    if (stderr) console.log("stderr:", stderr);

    return NextResponse.json({
      success: true,
      message: "Deployment completed successfully!",
      output: stdout,
      deployType,
    });
  } catch (error: unknown) {
    console.error("❌ Deployment failed:", error);

    const errorObj = error as { message?: string; stdout?: string; stderr?: string };
    return NextResponse.json(
      {
        success: false,
        error: errorObj.message || "Deployment failed",
        output: errorObj.stdout || "",
        stderr: errorObj.stderr || "",
      },
      { status: 500 }
    );
  }
}

// Optional: GET endpoint to check deployment status or get deployment history
export async function GET() {
  try {
    // Get git status and last commit info
    const { stdout: gitStatus } = await execAsync("git status --short");
    const { stdout: lastCommit } = await execAsync(
      "git log -1 --pretty=format:'%h - %s (%cr)'"
    );

    return NextResponse.json({
      success: true,
      status: {
        hasChanges: gitStatus.trim().length > 0,
        lastCommit: lastCommit.trim(),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    console.error("❌ Error checking status:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to check status",
      },
      { status: 500 }
    );
  }
}
