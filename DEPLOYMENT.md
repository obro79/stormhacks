# Deployment Guide - Daytona to Vercel

This guide explains how to deploy your Next.js application from Daytona to Vercel using automated scripts.

## Quick Start

### One-Time Setup

1. **Run the setup script:**
   ```bash
   npm run setup-vercel
   ```

2. **Choose your deployment method:**
   - **Option 1 (Recommended):** GitHub Integration - Automatic deployments on push
   - **Option 2:** Vercel CLI - Manual control over deployments

### Daily Workflow

#### Option A: Using Daytona Deploy Button (Easiest!)

If you're working in a Daytona workspace, you can deploy with a single click:

1. **Look for the Deploy button** in your Daytona workspace toolbar
2. **Choose your deployment option:**
   - 🚀 **Full Deploy** - Commit, push, and deploy to Vercel
   - ⚡ **Quick Deploy** - Commit and push (auto-deploys via GitHub)
   - 📦 **Deploy to Vercel Only** - Direct Vercel deployment
   - 💬 **Deploy with Custom Message** - Add a custom commit message

3. **Click and done!** The deployment runs automatically

#### Option B: Using Command Line

Once set up, deploying from terminal is as simple as:

```bash
npm run deploy
```

This single command will:
- ✅ Commit your current changes
- ✅ Push to GitHub
- ✅ Trigger Vercel deployment

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run deploy` | Full deployment: commit, push, and deploy |
| `npm run deploy:msg "Your message"` | Deploy with custom commit message |
| `npm run deploy:quick` | Quick commit and push (no custom message) |
| `npm run deploy:vercel` | Deploy to Vercel only (no git operations) |
| `npm run setup-vercel` | Run the setup wizard |

## Detailed Usage

### Deploy with Default Message

```bash
npm run deploy
```

Creates a commit with timestamp: `"Deploy: 2025-10-04 14:30:00"`

### Deploy with Custom Message

```bash
npm run deploy:msg "Add new feature: user authentication"
```

Or directly:

```bash
bash scripts/deploy.sh "Add new feature: user authentication"
```

### Quick Deploy (No Custom Message)

```bash
npm run deploy:quick
```

Uses commit message: `"Quick deploy"`

### Vercel Only (Skip Git Operations)

```bash
npm run deploy:vercel
```

Only deploys to Vercel, assumes changes are already pushed.

## Deployment Methods

### Method 1: GitHub Integration (Recommended)

**Advantages:**
- ✅ Fully automatic - no manual triggers needed
- ✅ Preview deployments for branches
- ✅ Easy rollbacks in Vercel dashboard
- ✅ Works with any git client

**Setup:**
1. Go to [Vercel Dashboard](https://vercel.com/new)
2. Import your repository: `obro79/stormhacks`
3. Configure:
   - Framework: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`
4. Deploy

**Usage:**
```bash
npm run deploy:quick  # Just commit and push
# Vercel auto-deploys from GitHub
```

### Method 2: Vercel CLI

**Advantages:**
- ✅ More control over deployments
- ✅ Can deploy without pushing to GitHub
- ✅ Deploy to preview environments

**Setup:**
1. Run `npm run setup-vercel`
2. Choose option 2
3. Log in to Vercel
4. Link your project

**Usage:**
```bash
npm run deploy  # Full deployment with Vercel CLI
```

## Environment Variables

### Local Development

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
DATABASE_URL=your_database_url
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
```

### Vercel (Production)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Settings → Environment Variables
4. Add variables for:
   - Production
   - Preview
   - Development

## Troubleshooting

### "Failed to push to remote repository"

**Solution:**
```bash
# Set up remote tracking
git push --set-upstream origin main

# Or force push (use with caution)
git push -f origin main
```

### "Vercel project not configured"

**Solution:**
```bash
npm run setup-vercel
# Choose option 2 and follow prompts
```

### "No changes to commit"

This is normal - the script will skip the commit step and push existing commits.

### "Permission denied"

**Solution:**
```bash
chmod +x scripts/deploy.sh
chmod +x scripts/setup-vercel.sh
```

### Deployment fails but code is pushed

If GitHub integration is enabled, check your [Vercel Dashboard](https://vercel.com/dashboard) - the deployment may still succeed automatically.

## CI/CD with GitHub Actions (Optional)

For advanced users, you can set up GitHub Actions:

1. Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

2. Add secrets to GitHub:
   - `VERCEL_TOKEN`
   - `ORG_ID`
   - `PROJECT_ID`

## Daytona Deploy Button Configuration

The `.devcontainer/devcontainer.json` file configures the Daytona deploy button with these options:

| Button Option | Command | Description |
|--------------|---------|-------------|
| 🚀 Full Deploy | `npm run deploy` | Complete deployment pipeline |
| ⚡ Quick Deploy | `npm run deploy:quick` | Fast commit and push |
| 📦 Vercel Only | `npm run deploy:vercel` | Direct Vercel deployment |
| 💬 Custom Message | `bash scripts/deploy.sh` | Deploy with custom commit message |

### How to Access the Deploy Button in Daytona

1. Open your workspace in Daytona
2. Look for the **Deploy** button in the toolbar/sidebar
3. Click to see all deployment options
4. Select your preferred deployment method
5. Confirm if prompted

The deploy button will automatically detect the configuration from `.devcontainer/devcontainer.json`.

## Project Structure

```
stormhacks/
├── .devcontainer/
│   └── devcontainer.json  # Daytona configuration (includes deploy button)
├── scripts/
│   ├── deploy.sh          # Main deployment script
│   └── setup-vercel.sh    # Setup wizard
├── .vercel/               # Vercel configuration (auto-generated)
├── package.json           # Includes deployment scripts
└── DEPLOYMENT.md          # This file
```

## Best Practices

1. **Test locally first:**
   ```bash
   npm run build
   npm run start
   ```

2. **Use meaningful commit messages:**
   ```bash
   npm run deploy:msg "Fix: resolve authentication bug"
   ```

3. **Check deployment status:**
   - GitHub: Check Actions tab
   - Vercel: Check [Dashboard](https://vercel.com/dashboard)

4. **Keep environment variables secure:**
   - Never commit `.env.local`
   - Add `.env*.local` to `.gitignore`

## Useful Links

- **Vercel Dashboard:** https://vercel.com/dashboard
- **GitHub Repository:** https://github.com/obro79/stormhacks
- **Vercel Documentation:** https://vercel.com/docs
- **Next.js Documentation:** https://nextjs.org/docs

## Support

For issues:
1. Check the troubleshooting section above
2. Review Vercel deployment logs
3. Check GitHub Actions logs (if using CI/CD)

---

**Made with ❤️ for seamless Daytona → Vercel deployments**
