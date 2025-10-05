import { FileChange } from './types';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export interface DeploymentResult {
  success: boolean;
  message: string;
  deploymentUrl?: string;
  error?: string;
}

/**
 * Deploy sandbox files to a deployment directory and push to Vercel
 */
export async function deploySandboxFiles(
  files: FileChange[],
  sessionId: string
): Promise<DeploymentResult> {
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
        const filePath = path.join(deployDir, file.path);
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
