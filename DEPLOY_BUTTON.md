# Deploy Button - Quick Reference

## Overview

The green **Deploy** button in your builder page is now connected to an automated deployment pipeline that commits your changes, pushes to GitHub, and triggers a Vercel deployment.

## How It Works

When you click the Deploy button:

1. **Commits Changes** - Automatically commits all current changes with a timestamped message
2. **Pushes to GitHub** - Pushes the commit to your repository (`obro79/stormhacks`)
3. **Triggers Deployment** - If you have Vercel GitHub integration enabled, deployment happens automatically

## Button States

| State | Display | Description |
|-------|---------|-------------|
| **Ready** | `Deploy` | Button is ready to deploy |
| **Deploying** | `Deploying...` | Deployment in progress (button disabled) |
| **Success** | `🎉 Deployed successfully!` | Shows for 5 seconds after success |
| **Error** | `❌ Deployment failed: [error]` | Shows error message if deployment fails |

## Setup Required

### One-Time Setup

Before using the Deploy button, you need to set up Vercel:

```bash
npm run setup-vercel
```

Choose **Option 1** (GitHub Integration - Recommended):
- Automatic deployments when you push to GitHub
- No additional configuration needed
- Deploy button will commit + push, and Vercel handles the rest

Or **Option 2** (Vercel CLI):
- More control over deployments
- Requires Vercel login and project linking
- Deploy button will commit + push + trigger Vercel CLI deployment

## Deployment Types

The Deploy button currently uses **"quick"** deployment mode, which:
- ✅ Commits all changes with message: `Deploy from builder: [timestamp]`
- ✅ Pushes to GitHub
- ✅ Relies on Vercel GitHub integration for actual deployment

### Customizing Deployment Behavior

You can modify the deployment behavior in `src/app/builder/page.tsx`:

```typescript
// Current configuration (line 189)
body: JSON.stringify({
  deployType: "quick", // Options: "quick", "full", "vercel"
  commitMessage: `Deploy from builder: ${new Date().toLocaleString()}`,
}),
```

**Deployment Type Options:**

| Type | Description | Use Case |
|------|-------------|----------|
| `"quick"` | Commit + Push only | When Vercel GitHub integration is enabled (Recommended) |
| `"full"` | Commit + Push + Vercel CLI deploy | When you want CLI to trigger deployment |
| `"vercel"` | Vercel deployment only (no git) | When changes are already committed |

## Troubleshooting

### Button doesn't respond
**Solution:** Check browser console for errors. Make sure the API route is accessible.

### Deployment fails with git error
**Solution:**
```bash
# Ensure you're on the correct branch
git branch

# Make sure git is configured
git config user.name
git config user.email
```

### "Permission denied" errors
**Solution:**
```bash
chmod +x scripts/deploy.sh
chmod +x scripts/setup-vercel.sh
```

### Deployment succeeds but nothing deploys
**Solution:** This means GitHub integration isn't set up. Either:
1. Set up Vercel GitHub integration (run `npm run setup-vercel`)
2. Change `deployType` to `"full"` to use Vercel CLI

## Viewing Deployment Status

After clicking Deploy:
1. ✅ Watch the button change to "Deploying..."
2. ✅ Success message appears: "🎉 Deployed successfully!"
3. ✅ Check [Vercel Dashboard](https://vercel.com/dashboard) for deployment progress
4. ✅ Check [GitHub Repository](https://github.com/obro79/stormhacks) to see your commit

## Manual Deployment (Alternative)

If you prefer command line deployment instead:

```bash
# Quick deploy (same as button)
npm run deploy:quick

# Full deployment with Vercel CLI
npm run deploy

# Custom commit message
bash scripts/deploy.sh "Your custom message"
```

## API Endpoint

The Deploy button calls: `POST /api/deploy`

**Request Body:**
```json
{
  "deployType": "quick",
  "commitMessage": "Deploy from builder: 2025-10-04 11:30:00"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Deployment completed successfully!",
  "output": "...",
  "deployType": "quick"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Error message",
  "output": "...",
  "stderr": "..."
}
```

## Configuration Files

| File | Purpose |
|------|---------|
| `src/app/builder/page.tsx` | Deploy button UI and handler (line 174-211, 347-358) |
| `src/app/api/deploy/route.ts` | API endpoint that executes deployment |
| `scripts/deploy.sh` | Bash script that handles git operations |
| `package.json` | NPM scripts for different deployment types |

## Best Practices

1. **Test locally first** before deploying
2. **Check for errors** in the browser console
3. **Monitor deployments** in Vercel dashboard
4. **Use meaningful commit messages** (customize in builder/page.tsx)
5. **Set up environment variables** in Vercel if your app needs them

## Advanced: Adding Deploy Options Menu

Want to add a dropdown with deployment options? Here's a quick guide:

1. Add a state for showing menu
2. Create a dropdown component with options:
   - Quick Deploy (commit + push)
   - Full Deploy (commit + push + Vercel)
   - Vercel Only (no git operations)
3. Pass selected `deployType` to `handleDeploy()`

Example implementation available in `DEPLOYMENT.md`.

---

**Need Help?** Check:
- Full deployment guide: [DEPLOYMENT.md](./DEPLOYMENT.md)
- Vercel Dashboard: https://vercel.com/dashboard
- GitHub Repo: https://github.com/obro79/stormhacks
