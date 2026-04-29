#!/bin/bash

# Release creation script for cozy-lasuite-visio
# This script allows interactive creation of betas and releases
#
# NOTE: This script is intended to be migrated to Node.js in the future
# to support npx execution. When migrating, use:
# - inquirer or @inquirer/prompts for the interactive menu
# - simple-git or child_process for git operations
# - @octokit/rest or execa for GitHub API/gh CLI
# - chalk for terminal colors

set -e

# Colors for messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Utility functions
error() {
    echo -e "${RED}❌ Error: $1${NC}" >&2
    exit 1
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    # Check if we are in a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        error "This script must be run in a git repository"
    fi

    # Check if gh CLI is installed
    if ! command -v gh &> /dev/null; then
        error "gh CLI is not installed. Install it from: https://cli.github.com/"
    fi

    # Check if gh CLI is authenticated
    if ! gh auth status &> /dev/null; then
        error "gh CLI is not authenticated. Run: gh auth login"
    fi

    # Check for uncommitted changes
    if ! git diff-index --quiet HEAD --; then
        error "You have uncommitted changes. Please commit or stash them before continuing."
    fi
}

# Detect base branch (main or master)
detect_base_branch() {
    # Check if main exists
    if git show-ref --verify --quiet refs/heads/main || \
       git show-ref --verify --quiet refs/remotes/origin/main; then
        echo "main"
    elif git show-ref --verify --quiet refs/heads/master || \
          git show-ref --verify --quiet refs/remotes/origin/master; then
        echo "master"
    else
        error "No 'main' or 'master' branch found"
    fi
}

# Checkout and pull base branch
update_base_branch() {
    local base_branch=$1
    
    info "Updating branch $base_branch..."
    git checkout "$base_branch" || error "Unable to checkout branch $base_branch"
    git pull origin "$base_branch" || error "Unable to pull branch $base_branch"
    success "Branch $base_branch is up to date"
}

# Read version from package.json
get_package_version() {
    if [ ! -f "package.json" ]; then
        error "package.json not found"
    fi
    
    local version
    version=$(grep -o '"version": *"[^"]*"' package.json | grep -o '"[0-9]\+\.[0-9]\+\.[0-9]\+"' | tr -d '"')
    
    if [ -z "$version" ]; then
        error "Unable to read version from package.json"
    fi
    
    echo "$version"
}

# Find the latest release branch (with the highest version number)
get_latest_release_branch() {
    local branches
    branches=$(git branch -r | grep "origin/release/" | sed 's/origin\///' | sort -V | tail -1)
    
    if [ -z "$branches" ]; then
        echo ""
    else
        echo "$branches"
    fi
}

# Extract version from branch name (release/1.0.0 -> 1.0.0)
get_version_from_branch() {
    local branch=$1
    echo "$branch" | sed 's/release\///'
}

# Find the latest existing beta for a given version
get_latest_beta() {
    local base_version=$1
    local latest_beta
    
    latest_beta=$(git tag -l "${base_version}-beta.*" 2>/dev/null | sort -V | tail -1)
    
    if [ -z "$latest_beta" ]; then
        echo ""
    else
        echo "$latest_beta"
    fi
}

# Increment minor version (1.1.0 -> 1.2.0)
increment_minor_version() {
    local version=$1
    local major
    local minor
    local patch
    
    major=$(echo "$version" | cut -d. -f1)
    minor=$(echo "$version" | cut -d. -f2)
    patch=$(echo "$version" | cut -d. -f3)
    
    local new_minor=$((minor + 1))
    echo "${major}.${new_minor}.0"
}

# Update version in package.json and manifest.webapp
update_version_in_files() {
    local old_version=$1
    local new_version=$2
    
    info "Updating version from $old_version to $new_version..."
    
    # Update package.json
    if [ -f "package.json" ]; then
        sed -i.bak "s/\"version\": *\"$old_version\"/\"version\": \"$new_version\"/" package.json
        rm -f package.json.bak
    fi
    
    # Update manifest.webapp
    if [ -f "manifest.webapp" ]; then
        sed -i.bak "s/\"version\": *\"$old_version\"/\"version\": \"$new_version\"/" manifest.webapp
        rm -f manifest.webapp.bak
    fi
    
    success "Version updated in package.json and manifest.webapp"
}

# Bump version on master branch after creating release branch
bump_version_on_master() {
    local old_version=$1
    local base_branch=$2
    local new_version
    
    new_version=$(increment_minor_version "$old_version")
    
    info "Bumping version on $base_branch to $new_version..."
    
    # Checkout master
    git checkout "$base_branch" || error "Unable to checkout $base_branch"
    
    # Update version in files
    update_version_in_files "$old_version" "$new_version"
    
    # Create commit
    git add package.json manifest.webapp
    git commit -m "chore: Bump to $new_version" || error "Unable to create commit"
    
    # Push with force-with-lease
    git push origin "$base_branch" --force-with-lease || error "Unable to push to $base_branch"
    
    success "Version bumped to $new_version on $base_branch"
}

# Open GitHub releases page in browser
open_releases_page() {
    info "Opening GitHub releases page..."
    gh browse --releases || warning "Unable to open browser"
}

# Increment beta number (1.0.0-beta.2 -> 1.0.0-beta.3)
increment_beta() {
    local latest_beta=$1
    local base_version
    local beta_num
    local next_num
    
    base_version=$(echo "$latest_beta" | sed 's/-beta\.[0-9]*$//')
    beta_num=$(echo "$latest_beta" | grep -o 'beta\.[0-9]*$' | sed 's/beta\.//')
    next_num=$((beta_num + 1))
    
    echo "${base_version}-beta.${next_num}"
}

# Create and push a tag
create_and_push_tag() {
    local tag=$1
    local branch=$2
    
    info "Creating tag $tag on $branch..."
    
    # Check if tag already exists
    if git rev-parse "$tag" >/dev/null 2>&1; then
        error "Tag $tag already exists"
    fi
    
    # Create tag on the latest commit of the branch
    git tag "$tag" "$branch" || error "Unable to create tag $tag"
    
    # Push tag
    git push origin "$tag" || error "Unable to push tag $tag"
    
    success "Tag $tag created and pushed"
}

# Create a GitHub release
create_github_release() {
    local tag=$1
    local is_prerelease=$2
    
    info "Creating GitHub release for $tag..."
    
    if [ "$is_prerelease" = "true" ]; then
        gh release create "$tag" \
            --title "$tag" \
            --generate-notes \
            --prerelease || error "Unable to create GitHub release"
    else
        gh release create "$tag" \
            --title "$tag" \
            --generate-notes || error "Unable to create GitHub release"
    fi
    
    success "GitHub release created: $tag"
}

# Option 1: Create a new beta on a new branch
create_new_beta_branch() {
    local version=$1
    local base_branch=$2
    local release_branch="release/$version"
    local tag="${version}-beta.1"
    
    info "Creating branch $release_branch from $base_branch..."
    
    # Check if branch already exists
    if git show-ref --verify --quiet "refs/heads/$release_branch" || \
       git show-ref --verify --quiet "refs/remotes/origin/$release_branch"; then
        error "Branch $release_branch already exists"
    fi
    
    # Create branch
    git checkout -b "$release_branch" "$base_branch" || error "Unable to create branch $release_branch"
    
    # Push branch
    git push -u origin "$release_branch" || error "Unable to push branch $release_branch"
    
    success "Branch $release_branch created and pushed"
    
    # Create and push tag
    create_and_push_tag "$tag" "$release_branch"
    
    # Create GitHub release
    create_github_release "$tag" "true"
    
    # Bump version on master
    bump_version_on_master "$version" "$base_branch"
    
    # Open releases page
    open_releases_page
}

# Option 2: Add a beta to the latest existing release branch
add_beta_to_existing() {
    local latest_branch=$1
    local base_version
    local latest_beta
    local next_beta
    
    base_version=$(get_version_from_branch "$latest_branch")
    
    info "Searching for existing betas for $base_version..."
    
    # Fetch remote tags to ensure we have all tags
    git fetch --tags origin >/dev/null 2>&1 || true
    
    latest_beta=$(get_latest_beta "$base_version")
    
    if [ -z "$latest_beta" ]; then
        next_beta="${base_version}-beta.1"
        info "No beta found. Proposing: $next_beta"
    else
        next_beta=$(increment_beta "$latest_beta")
        info "Latest beta found: $latest_beta"
        info "Proposing: $next_beta"
    fi
    
    # Ask for confirmation
    read -p "Confirm creation of tag $next_beta? (Y/n): " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]] && [ -n "$confirm" ]; then
        info "Operation cancelled"
        return
    fi
    
    # Ensure we are on the release branch
    git checkout "$latest_branch" || error "Unable to checkout $latest_branch"
    
    # Create and push tag on the latest commit of the branch
    create_and_push_tag "$next_beta" "$latest_branch"
    
    # Create GitHub release
    create_github_release "$next_beta" "true"
    
    # Open releases page
    open_releases_page
}

# Option 3: Create a final release on the latest existing release branch
create_final_release() {
    local latest_branch=$1
    local version
    
    version=$(get_version_from_branch "$latest_branch")
    
    info "Creating final release $version on $latest_branch..."
    
    # Check if tag already exists
    if git rev-parse "$version" >/dev/null 2>&1; then
        error "Tag $version already exists"
    fi
    
    # Ensure we are on the release branch
    git checkout "$latest_branch" || error "Unable to checkout $latest_branch"
    
    # Ask for confirmation
    read -p "Confirm creation of final release $version? (Y/n): " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]] && [ -n "$confirm" ]; then
        info "Operation cancelled"
        return
    fi
    
    # Create and push tag on the latest commit of the branch
    create_and_push_tag "$version" "$latest_branch"
    
    # Create GitHub release
    create_github_release "$version" "false"
    
    # Open releases page
    open_releases_page
}

# Display main menu
show_menu() {
    local version=$1
    local base_branch=$2
    local latest_branch=$3
    
    echo ""
    echo "========================================"
    echo "   Release Creation - Cozy Visio"
    echo "========================================"
    echo ""
    echo -e "Current version (package.json): ${GREEN}$version${NC}"
    echo -e "Base branch: ${GREEN}$base_branch${NC} (up to date)"
    echo ""
    
    if [ -n "$latest_branch" ]; then
        echo -e "Latest existing release branch: ${YELLOW}$latest_branch${NC}"
    else
        echo -e "${YELLOW}No existing release branch${NC}"
    fi
    
    echo ""
    echo "What would you like to create?"
    echo ""
    echo -e "${GREEN}1)${NC} New beta ${version}-beta.1 (will create branch release/${version})"
    echo ""
    
    if [ -n "$latest_branch" ]; then
        local existing_version
        existing_version=$(get_version_from_branch "$latest_branch")
        echo "--- Actions on $latest_branch ---"
        echo -e "${GREEN}2)${NC} Add a beta to $latest_branch"
        echo -e "${GREEN}3)${NC} Create final release $existing_version on $latest_branch"
    else
        echo -e "${YELLOW}(Options 2 and 3 unavailable - no existing release branch)${NC}"
    fi
    
    echo ""
    echo -e "${RED}q)${NC} Quit"
    echo ""
}

# Main function
main() {
    # Check prerequisites
    check_prerequisites
    
    # Detect base branch
    local base_branch
    base_branch=$(detect_base_branch)
    
    # Update base branch
    update_base_branch "$base_branch"
    
    # Read version from package.json
    local version
    version=$(get_package_version)
    
    # Find latest release branch
    local latest_branch
    latest_branch=$(get_latest_release_branch)
    
    # Menu loop
    while true; do
        show_menu "$version" "$base_branch" "$latest_branch"
        
        read -p "Your choice: " choice
        
        case "$choice" in
            1)
                create_new_beta_branch "$version" "$base_branch"
                break
                ;;
            2)
                if [ -z "$latest_branch" ]; then
                    warning "Option not available"
                else
                    add_beta_to_existing "$latest_branch"
                    break
                fi
                ;;
            3)
                if [ -z "$latest_branch" ]; then
                    warning "Option not available"
                else
                    create_final_release "$latest_branch"
                    break
                fi
                ;;
            q|Q)
                info "Goodbye!"
                exit 0
                ;;
            *)
                warning "Invalid choice"
                ;;
        esac
    done
    
    echo ""
    success "Operation completed successfully!"
}

# Execute script
main "$@"
