import { FileChange } from './types';
import { createGitHubRepo } from './githubService';
import { deployToVercel } from './vercelService';
import { generateProjectName } from './naming';

export interface DeploymentResult {
  success: boolean;
  message: string;
  deploymentUrl?: string;
  githubUrl?: string;
  repoName?: string;
  error?: string;
}

/**
 * One-click deploy: push the generated files to a new GitHub repo,
 * then create a Vercel project from that repo and wait for it to go live.
 */
export async function deployToGitHubAndVercel(
  files: FileChange[],
  projectPrompt?: string
): Promise<DeploymentResult> {
  try {
    const projectName = generateProjectName(projectPrompt);
    const githubResult = await createGitHubRepo(files, projectName);

    if (!githubResult.success || !githubResult.repoUrl || !githubResult.repoName) {
      return {
        success: false,
        message: 'Failed to create GitHub repository',
        error: githubResult.error,
      };
    }

    const vercelResult = await deployToVercel(githubResult.repoUrl, githubResult.repoName);

    if (!vercelResult.success) {
      // The repo exists even though Vercel failed, so return its URL.
      return {
        success: false,
        message: 'GitHub repo created, but Vercel deployment failed',
        githubUrl: githubResult.repoUrl,
        repoName: githubResult.repoName,
        error: vercelResult.error,
      };
    }

    return {
      success: true,
      message: 'Successfully deployed to GitHub and Vercel!',
      deploymentUrl: vercelResult.deploymentUrl,
      githubUrl: githubResult.repoUrl,
      repoName: githubResult.repoName,
    };
  } catch (error: unknown) {
    console.error('Deployment failed:', error);
    return {
      success: false,
      message: 'Deployment failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
