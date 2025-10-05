import { FileChange } from './types';

const GITHUB_API = 'https://api.github.com';

export interface GitHubRepoResult {
  success: boolean;
  repoUrl?: string;
  cloneUrl?: string;
  repoName?: string;
  error?: string;
}

/**
 * Create a new GitHub repository and push files to it
 */
export async function createGitHubRepo(
  files: FileChange[],
  projectName: string,
  username: string = process.env.GITHUB_USERNAME || 'owenfisher47'
): Promise<GitHubRepoResult> {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    return {
      success: false,
      error: 'GITHUB_TOKEN not configured in environment variables',
    };
  }

  try {
    // Generate unique repo name
    const timestamp = Date.now();
    const sanitizedProjectName = projectName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50);
    const repoName = `echome-${sanitizedProjectName}-${timestamp}`;

    console.log(`📦 Creating GitHub repo: ${repoName}`);

    // Step 1: Create the repository
    const createRepoResponse = await fetch(`${GITHUB_API}/user/repos`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: repoName,
        description: `EchoMe generated project: ${projectName}`,
        private: false,
        auto_init: true, // Initialize with README
      }),
    });

    if (!createRepoResponse.ok) {
      const error = await createRepoResponse.text();
      throw new Error(`Failed to create repo: ${error}`);
    }

    const repoData = await createRepoResponse.json();
    const repoUrl = repoData.html_url;
    const cloneUrl = repoData.clone_url;
    const defaultBranch = repoData.default_branch || 'main';

    console.log(`✅ Repo created: ${repoUrl}`);

    // Wait a moment for GitHub to initialize the repo
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 2: Get the latest commit SHA (from the auto-initialized commit)
    console.log(`🔍 Getting base tree...`);
    const refResponse = await fetch(
      `${GITHUB_API}/repos/${username}/${repoName}/git/ref/heads/${defaultBranch}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!refResponse.ok) {
      throw new Error('Failed to get base commit');
    }

    const refData = await refResponse.json();
    const baseCommitSha = refData.object.sha;

    // Step 3: Get the base tree
    const commitResponse = await fetch(
      `${GITHUB_API}/repos/${username}/${repoName}/git/commits/${baseCommitSha}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!commitResponse.ok) {
      throw new Error('Failed to get base tree');
    }

    const commitData = await commitResponse.json();
    const baseTreeSha = commitData.tree.sha;

    // Step 4: Create blobs for all files
    console.log(`📝 Creating blobs for ${files.length} files...`);
    const tree = [];

    for (const file of files) {
      if (file.operation === 'delete') continue;

      // Create blob
      const blobResponse = await fetch(
        `${GITHUB_API}/repos/${username}/${repoName}/git/blobs`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: file.content,
            encoding: 'utf-8',
          }),
        }
      );

      if (!blobResponse.ok) {
        console.warn(`⚠️  Failed to create blob for ${file.path}`);
        continue;
      }

      const blobData = await blobResponse.json();

      tree.push({
        path: file.path,
        mode: '100644', // Regular file
        type: 'blob',
        sha: blobData.sha,
      });
    }

    console.log(`✅ Created ${tree.length} blobs`);

    // Step 5: Create new tree
    console.log(`🌳 Creating tree...`);
    const treeResponse = await fetch(
      `${GITHUB_API}/repos/${username}/${repoName}/git/trees`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          base_tree: baseTreeSha,
          tree: tree,
        }),
      }
    );

    if (!treeResponse.ok) {
      const error = await treeResponse.text();
      throw new Error(`Failed to create tree: ${error}`);
    }

    const treeData = await treeResponse.json();
    const newTreeSha = treeData.sha;

    // Step 6: Create commit
    console.log(`💾 Creating commit...`);
    const newCommitResponse = await fetch(
      `${GITHUB_API}/repos/${username}/${repoName}/git/commits`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Initial commit: ${projectName}\n\nGenerated by EchoMe`,
          tree: newTreeSha,
          parents: [baseCommitSha],
        }),
      }
    );

    if (!newCommitResponse.ok) {
      const error = await newCommitResponse.text();
      throw new Error(`Failed to create commit: ${error}`);
    }

    const newCommitData = await newCommitResponse.json();
    const newCommitSha = newCommitData.sha;

    // Step 7: Update reference
    console.log(`🔄 Updating branch reference...`);
    const updateRefResponse = await fetch(
      `${GITHUB_API}/repos/${username}/${repoName}/git/refs/heads/${defaultBranch}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sha: newCommitSha,
          force: true,
        }),
      }
    );

    if (!updateRefResponse.ok) {
      const error = await updateRefResponse.text();
      throw new Error(`Failed to update ref: ${error}`);
    }

    console.log(`✅ Successfully pushed ${files.length} files to GitHub`);

    return {
      success: true,
      repoUrl,
      cloneUrl,
      repoName,
    };
  } catch (error) {
    console.error('❌ GitHub repo creation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate a project name from the first user message or default
 */
export function generateProjectName(prompt?: string): string {
  if (!prompt) return 'project';

  // Extract key words from prompt
  const words = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3)
    .slice(0, 3);

  return words.length > 0 ? words.join('-') : 'project';
}
