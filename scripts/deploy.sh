#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[DEPLOY]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Start deployment process
print_status "Starting automated deployment process..."
echo ""

# Check if we're in a git repository
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    print_error "Not a git repository!"
    exit 1
fi

# Check if there are any changes to commit
if [[ -z $(git status -s) ]]; then
    print_warning "No changes to commit."
    SKIP_COMMIT=true
else
    SKIP_COMMIT=false
fi

# Get commit message from argument or use default
if [ -z "$1" ]; then
    COMMIT_MSG="Deploy: $(date '+%Y-%m-%d %H:%M:%S')"
    print_status "Using default commit message: $COMMIT_MSG"
else
    COMMIT_MSG="$1"
    print_status "Using custom commit message: $COMMIT_MSG"
fi

# Stage and commit changes if there are any
if [ "$SKIP_COMMIT" = false ]; then
    print_status "Staging all changes..."
    git add .

    if [ $? -ne 0 ]; then
        print_error "Failed to stage changes!"
        exit 1
    fi

    print_status "Committing changes..."
    git commit -m "$COMMIT_MSG"

    if [ $? -ne 0 ]; then
        print_error "Failed to commit changes!"
        exit 1
    fi

    print_success "Changes committed successfully!"
else
    print_status "Skipping commit step (no changes detected)"
fi

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
print_status "Current branch: $CURRENT_BRANCH"

# Push to remote
print_status "Pushing to remote repository..."
git push origin "$CURRENT_BRANCH"

if [ $? -ne 0 ]; then
    print_error "Failed to push to remote repository!"
    print_warning "You may need to set up the remote branch or check your credentials."
    exit 1
fi

print_success "Successfully pushed to GitHub!"
echo ""

# Check if Vercel is configured
if [ -f ".vercel/project.json" ]; then
    print_status "Vercel project detected. Triggering deployment..."

    # Deploy to Vercel (production)
    npx vercel --prod --yes

    if [ $? -eq 0 ]; then
        print_success "Vercel deployment triggered successfully!"
        echo ""
        print_status "Your deployment is in progress. Check your Vercel dashboard for status."
    else
        print_error "Vercel deployment failed!"
        print_warning "You can still check Vercel dashboard - it may auto-deploy from GitHub."
        exit 1
    fi
else
    print_warning "Vercel project not configured locally."
    print_status "If you have Vercel GitHub integration enabled, deployment will happen automatically."
    print_status "Otherwise, run 'npm run setup-vercel' to configure Vercel CLI."
fi

echo ""
print_success "Deployment process completed!"
print_status "Repository: https://github.com/obro79/stormhacks"
print_status "Check your Vercel dashboard: https://vercel.com/dashboard"
