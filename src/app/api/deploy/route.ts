import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { deploySandboxFiles, cleanupOldDeployments } from "@/lib/deployHelpers";

const execAsync = promisify(exec);

// Access filesStore from download route
let filesStore: Map<string, any[]>;
try {
  const filesStoreModule = require('../download/route');
  filesStore = filesStoreModule.filesStore || new Map();
} catch (error) {
  console.warn('⚠️ Could not import filesStore, creating new Map');
  filesStore = new Map();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { commitMessage, deployType = "full", sessionId, sandboxId } = body;

    console.log("🚀 Starting deployment...", {
      commitMessage,
      deployType,
      sessionId,
      sandboxId,
      isSandboxDeploy: !!sessionId
    });

    // If sessionId is provided, deploy the sandbox files
    if (sessionId) {
      console.log("📦 Deploying sandbox files...");

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

      // Deploy sandbox files to Vercel
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

    // Otherwise, deploy the main stormhacks codebase (original functionality)
    let command = "";
    let message = commitMessage || `Deploy: ${new Date().toISOString()}`;

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
  } catch (error: any) {
    console.error("❌ Deployment failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Deployment failed",
        output: error.stdout || "",
        stderr: error.stderr || "",
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
  } catch (error: any) {
    console.error("❌ Error checking status:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to check status",
      },
      { status: 500 }
    );
  }
}
