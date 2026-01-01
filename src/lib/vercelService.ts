const VERCEL_API = 'https://api.vercel.com';

export interface VercelDeploymentResult {
  success: boolean;
  deploymentUrl?: string;
  projectId?: string;
  deploymentId?: string;
  error?: string;
}
//

/**
 * Deploy a GitHub repository to Vercel
 */
export async function deployToVercel(
  repoUrl: string,
  repoName: string,
  username: string = process.env.GITHUB_USERNAME || ''
): Promise<VercelDeploymentResult> {
  const token = process.env.VERCEL_TOKEN;

  if (!token) {
    return {
      success: false,
      error: 'VERCEL_TOKEN not configured in environment variables',
    };
  }

  try {
    console.log(`🚀 Deploying ${repoName} to Vercel...`);

    // Step 1: Create Vercel project linked to GitHub repo
    console.log(`📦 Creating Vercel project...`);
    const createProjectResponse = await fetch(`${VERCEL_API}/v9/projects`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: repoName,
        framework: 'nextjs',
        gitRepository: {
          type: 'github',
          repo: `${username}/${repoName}`,
        },
        publicSource: true,
        buildCommand: 'npm run build',
        devCommand: 'npm run dev',
        installCommand: 'npm install',
        outputDirectory: '.next',
      }),
    });

    if (!createProjectResponse.ok) {
      const error = await createProjectResponse.text();
      console.error('Vercel project creation error:', error);
      throw new Error(`Failed to create Vercel project: ${error}`);
    }

    const projectData = await createProjectResponse.json();
    const projectId = projectData.id;

    console.log(`✅ Project created: ${projectId}`);

    // Step 2: Trigger deployment
    console.log(`🔄 Triggering deployment...`);
    const deployResponse = await fetch(`${VERCEL_API}/v13/deployments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: repoName,
        project: projectId,
        gitSource: {
          type: 'github',
          ref: 'main',
          repoId: projectData.link?.repoId,
          repo: `${username}/${repoName}`,
        },
        target: 'production',
      }),
    });

    if (!deployResponse.ok) {
      const error = await deployResponse.text();
      console.error('Vercel deployment error:', error);
      throw new Error(`Failed to trigger deployment: ${error}`);
    }

    const deploymentData = await deployResponse.json();
    const deploymentId = deploymentData.id;
    const deploymentUrl = `https://${deploymentData.url}`;

    console.log(`✅ Deployment triggered: ${deploymentId}`);
    console.log(`📍 URL: ${deploymentUrl}`);

    // Step 3: Wait for deployment to be ready (poll status)
    console.log(`⏳ Waiting for deployment to complete...`);
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max (5s intervals)

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

      const statusResponse = await fetch(
        `${VERCEL_API}/v13/deployments/${deploymentId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        const state = statusData.readyState;

        console.log(`📊 Deployment state: ${state}`);

        if (state === 'READY') {
          console.log(`✅ Deployment complete!`);
          return {
            success: true,
            deploymentUrl,
            projectId,
            deploymentId,
          };
        }

        if (state === 'ERROR' || state === 'CANCELED') {
          throw new Error(`Deployment failed with state: ${state}`);
        }
      }

      attempts++;
    }

    // If we get here, deployment is taking too long but might still succeed
    console.log(`⚠️  Deployment still in progress after 5 minutes`);
    return {
      success: true,
      deploymentUrl,
      projectId,
      deploymentId,
    };
  } catch (error) {
    console.error('❌ Vercel deployment failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get deployment status
 */
export async function getDeploymentStatus(
  deploymentId: string
): Promise<{ state: string; url?: string }> {
  const token = process.env.VERCEL_TOKEN;

  if (!token) {
    throw new Error('VERCEL_TOKEN not configured');
  }

  const response = await fetch(
    `${VERCEL_API}/v13/deployments/${deploymentId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to get deployment status');
  }

  const data = await response.json();
  return {
    state: data.readyState,
    url: data.url ? `https://${data.url}` : undefined,
  };
}
