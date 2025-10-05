#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_header() {
    echo ""
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}========================================${NC}"
    echo ""
}

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
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

print_step() {
    echo -e "${GREEN}➜${NC} $1"
}

clear

print_header "Vercel Deployment Setup Guide"

echo "This script will guide you through setting up automated deployments to Vercel."
echo ""

# Check if Vercel CLI is installed
print_status "Checking Vercel CLI installation..."
if command -v npx vercel &> /dev/null; then
    print_success "Vercel CLI is available via npx"
else
    print_error "Vercel CLI not found!"
    print_status "Installing Vercel CLI..."
    npm install -D vercel
fi

echo ""
print_header "Setup Options"

echo "Choose your deployment approach:"
echo ""
echo "  1) GitHub Integration (Recommended)"
echo "     - Automatic deployments on git push"
echo "     - No manual triggering needed"
echo "     - Preview deployments for branches"
echo ""
echo "  2) Vercel CLI (Manual Control)"
echo "     - Deploy from command line"
echo "     - More control over deployments"
echo "     - Requires Vercel authentication"
echo ""

read -p "Enter your choice (1 or 2): " choice

if [ "$choice" == "1" ]; then
    print_header "Option 1: GitHub Integration Setup"

    echo "Follow these steps to set up automatic deployments:"
    echo ""
    print_step "1. Go to: https://vercel.com/new"
    print_step "2. Click 'Import Git Repository'"
    print_step "3. Select your repository: obro79/stormhacks"
    print_step "4. Configure your project:"
    echo "   - Framework Preset: Next.js"
    echo "   - Root Directory: ./"
    echo "   - Build Command: npm run build"
    echo "   - Output Directory: .next"
    print_step "5. Add environment variables if needed"
    print_step "6. Click 'Deploy'"
    echo ""
    print_success "Once set up, every push to GitHub will automatically deploy!"
    echo ""
    print_status "After completing setup, you can use:"
    echo "  • npm run deploy        - Commit, push, and auto-deploy"
    echo "  • npm run deploy:quick  - Quick commit and push"
    echo ""

elif [ "$choice" == "2" ]; then
    print_header "Option 2: Vercel CLI Setup"

    print_status "Logging into Vercel..."
    echo ""
    npx vercel login

    if [ $? -eq 0 ]; then
        print_success "Successfully logged in!"
        echo ""
        print_status "Linking project to Vercel..."
        npx vercel link

        if [ $? -eq 0 ]; then
            print_success "Project linked successfully!"
            echo ""
            print_status "You can now use:"
            echo "  • npm run deploy         - Full deployment (commit, push, deploy)"
            echo "  • npm run deploy:vercel  - Deploy to Vercel only"
            echo "  • npx vercel --prod      - Deploy to production"
            echo ""
        else
            print_error "Failed to link project!"
        fi
    else
        print_error "Failed to log in to Vercel!"
    fi
else
    print_error "Invalid choice!"
    exit 1
fi

print_header "Additional Configuration"

echo "Environment Variables:"
print_status "If your app needs environment variables:"
print_step "1. Create a .env.local file for local development"
print_step "2. Add variables to Vercel:"
echo "   - Go to: https://vercel.com/dashboard"
echo "   - Select your project"
echo "   - Settings → Environment Variables"
echo "   - Add your variables for Production, Preview, and Development"
echo ""

echo "Deployment Commands Available:"
print_step "npm run deploy              - Full deployment pipeline"
print_step "npm run deploy:quick        - Quick commit and push"
print_step "npm run deploy:vercel       - Deploy to Vercel directly"
print_step "bash scripts/deploy.sh 'Custom commit message'"
echo ""

print_header "Setup Complete!"

print_success "Your deployment workflow is ready!"
echo ""
print_status "Quick Start:"
echo "  1. Make your changes in Daytona"
echo "  2. Run: npm run deploy"
echo "  3. Your app will be live on Vercel!"
echo ""
print_status "Useful Links:"
echo "  • Vercel Dashboard: https://vercel.com/dashboard"
echo "  • GitHub Repo: https://github.com/obro79/stormhacks"
echo "  • Vercel Docs: https://vercel.com/docs"
echo ""
