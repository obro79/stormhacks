import { FileChange } from './types';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { createGitHubRepo, generateProjectName } from './githubService';
import { deployToVercel } from './vercelService';

const execAsync = promisify(exec);

/**
 * Validate that a file path doesn't escape the base directory (path traversal protection)
 */
function validateFilePath(basePath: string, filePath: string): string {
  const resolvedPath = path.resolve(path.join(basePath, filePath));
  if (!resolvedPath.startsWith(path.resolve(basePath) + path.sep)) {
    throw new Error(`Path traversal detected: ${filePath}`);
  }
  return resolvedPath;
}

export interface DeploymentResult {
  success: boolean;
  message: string;
  deploymentUrl?: string;
  githubUrl?: string;
  repoName?: string;
  error?: string;
}

/**
 * Deploy sandbox files to a deployment directory and push to Vercel
 */
export async function deploySandboxFiles(
  files: FileChange[],
  sessionId: string
): Promise<DeploymentResult> {
  // Input validation
  if (!Array.isArray(files) || files.length === 0) {
    return { success: false, message: 'Validation failed', error: 'No files provided' };
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(sessionId)) {
    return { success: false, message: 'Validation failed', error: 'Invalid session ID format' };
  }

  const deployDir = path.join(process.cwd(), '.deployments', sessionId);

  try {
    console.log(`🚀 Starting deployment for session: ${sessionId}`);

    // Step 1: Create deployment directory
    console.log(`📁 Creating deployment directory: ${deployDir}`);
    await fs.mkdir(deployDir, { recursive: true });

    // Step 2: Write all files to deployment directory
    console.log(`📝 Writing ${files.length} files to deployment directory...`);
    for (const file of files) {
      if (file.operation !== 'delete') {
        // Validate file path to prevent path traversal attacks
        const filePath = validateFilePath(deployDir, file.path);
        const fileDir = path.dirname(filePath);

        // Create directory if it doesn't exist
        await fs.mkdir(fileDir, { recursive: true });

        // Write file content
        await fs.writeFile(filePath, file.content, 'utf-8');
        console.log(`  ✅ Written: ${file.path}`);
      }
    }

    // Step 3: Initialize git repository if not exists
    console.log(`🔧 Initializing git repository...`);
    try {
      await execAsync('git rev-parse --git-dir', { cwd: deployDir });
      console.log(`  ℹ️  Git repository already exists`);
    } catch {
      console.log(`  📦 Initializing new git repository`);
      await execAsync('git init', { cwd: deployDir });
      await execAsync('git config user.name "Sandbox Builder"', { cwd: deployDir });
      await execAsync('git config user.email "builder@sandbox.local"', { cwd: deployDir });
    }

    // Step 4: Create .gitignore if it doesn't exist
    const gitignorePath = path.join(deployDir, '.gitignore');
    try {
      await fs.access(gitignorePath);
    } catch {
      console.log(`📝 Creating .gitignore...`);
      await fs.writeFile(gitignorePath, `
node_modules/
.next/
.vercel/
*.log
.env*.local
.DS_Store
`, 'utf-8');
    }

    // Step 5: Commit changes
    console.log(`💾 Committing changes...`);
    await execAsync('git add .', { cwd: deployDir });

    try {
      await execAsync(
        `git commit -m "Deploy sandbox ${sessionId}: ${new Date().toISOString()}"`,
        { cwd: deployDir }
      );
      console.log(`  ✅ Changes committed`);
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('nothing to commit')) {
        console.log(`  ℹ️  No changes to commit`);
      } else {
        throw error;
      }
    }

    // Step 6: Deploy to Vercel
    console.log(`🚀 Deploying to Vercel...`);
    const { stdout } = await execAsync(
      'npx vercel --prod --yes',
      {
        cwd: deployDir,
        env: {
          ...process.env,
          VERCEL_ORG_ID: process.env.VERCEL_ORG_ID,
          VERCEL_PROJECT_ID: process.env.VERCEL_PROJECT_ID,
        },
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      }
    );

    console.log(`✅ Deployment completed`);
    console.log(`📋 Output:`, stdout);

    // Extract deployment URL from Vercel output
    const urlMatch = stdout.match(/https:\/\/[^\s]+\.vercel\.app/);
    const deploymentUrl = urlMatch ? urlMatch[0] : undefined;

    return {
      success: true,
      message: 'Deployment successful!',
      deploymentUrl,
    };
  } catch (error: unknown) {
    console.error(`❌ Deployment failed:`, error);
    return {
      success: false,
      message: 'Deployment failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Deploy sandbox files to GitHub and Vercel (one-click deploy)
 */
export async function deployToGitHubAndVercel(
  files: FileChange[],
  sessionId: string,
  projectPrompt?: string
): Promise<DeploymentResult> {
  try {
    console.log(`🚀 Starting GitHub + Vercel deployment for session: ${sessionId}`);

    // Step 1: Generate project name from prompt
    const projectName = generateProjectName(projectPrompt);
    console.log(`📝 Project name: ${projectName}`);

    // Step 2: Create GitHub repository and push code
    console.log(`📦 Creating GitHub repository...`);
    const githubResult = await createGitHubRepo(files, projectName);

    if (!githubResult.success || !githubResult.repoUrl || !githubResult.repoName) {
      return {
        success: false,
        message: 'Failed to create GitHub repository',
        error: githubResult.error,
      };
    }

    console.log(`✅ GitHub repo created: ${githubResult.repoUrl}`);

    // Step 3: Deploy to Vercel
    console.log(`🚀 Deploying to Vercel...`);
    const vercelResult = await deployToVercel(
      githubResult.repoUrl,
      githubResult.repoName
    );

    if (!vercelResult.success) {
      // GitHub repo was created but Vercel deployment failed
      return {
        success: false,
        message: 'GitHub repo created, but Vercel deployment failed',
        githubUrl: githubResult.repoUrl,
        repoName: githubResult.repoName,
        error: vercelResult.error,
      };
    }

    console.log(`✅ Deployment complete!`);
    console.log(`📍 GitHub: ${githubResult.repoUrl}`);
    console.log(`📍 Vercel: ${vercelResult.deploymentUrl}`);

    return {
      success: true,
      message: 'Successfully deployed to GitHub and Vercel!',
      deploymentUrl: vercelResult.deploymentUrl,
      githubUrl: githubResult.repoUrl,
      repoName: githubResult.repoName,
    };
  } catch (error: unknown) {
    console.error(`❌ Deployment failed:`, error);
    return {
      success: false,
      message: 'Deployment failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Clean up old deployment directories
 */
export async function cleanupOldDeployments(keepCount: number = 5): Promise<void> {
  const deploymentsDir = path.join(process.cwd(), '.deployments');

  try {
    const entries = await fs.readdir(deploymentsDir, { withFileTypes: true });
    const dirs = entries
      .filter(entry => entry.isDirectory())
      .map(entry => ({
        name: entry.name,
        path: path.join(deploymentsDir, entry.name),
      }));

    // Sort by creation time (newest first)
    const dirsWithStats = await Promise.all(
      dirs.map(async dir => ({
        ...dir,
        stat: await fs.stat(dir.path),
      }))
    );

    dirsWithStats.sort((a, b) => b.stat.birthtimeMs - a.stat.birthtimeMs);

    // Remove old directories
    if (dirsWithStats.length > keepCount) {
      const toRemove = dirsWithStats.slice(keepCount);
      console.log(`🧹 Cleaning up ${toRemove.length} old deployment(s)...`);

      for (const dir of toRemove) {
        console.log(`  🗑️  Removing: ${dir.name}`);
        await fs.rm(dir.path, { recursive: true, force: true });
      }
    }
  } catch (error) {
    console.warn(`⚠️  Failed to clean up old deployments:`, error);
    // Don't throw - cleanup failure shouldn't break deployment
  }
}
