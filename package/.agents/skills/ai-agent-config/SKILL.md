---
name: agentools
description: Manage AI coding skills across platforms (Claude Code, Antigravity, Cursor, Windsurf) using agentools CLI. Use when the user wants to sync skills to/from GitHub, install to multiple platforms, add custom skill sources, or configure skill management settings.
---

# AI Agent Config Management

Complete guide for the `agentools` CLI tool - universal skill management across AI coding platforms.

## Core Commands

### GitHub Sync

```bash
# Initialize with repository
agentools init --repo https://github.com/username/my-skills.git

# Push local skills to GitHub
agentools push --message "Added new skills"

# Pull skills from GitHub
agentools pull

# Bi-directional sync
agentools sync --message "Sync latest"
```

### Installation

```bash
# Install to all detected platforms
agentools install

# Force reinstall
agentools install --force

# Install specific skill
agentools install --skill backend-patterns
```

### Source Management

```bash
# Add custom source
agentools source add https://github.com/company/skills.git \
  --name company-skills \
  --branch main

# List sources
agentools source list

# Enable/disable
agentools source enable company-skills
agentools source disable company-skills
```

### Configuration

```bash
# Get/set config values
agentools config get repository.url
agentools config set repository.autoSync true

# Edit in $EDITOR
agentools config edit

# Validate config
agentools config validate
```

### Platform Info

```bash
# Show detected platforms
agentools platforms

# List installed skills
agentools list
```

## Common Workflows

### First-Time Setup

**User**: "Set up agentools with my GitHub"

**Assistant**:
```bash
# Initialize with your repository
agentools init --repo https://github.com/yourname/my-ai-skills.git

# This will:
# 1. Create ~/.agentools/config.json
# 2. Clone your repo to ~/.agentools/sync-repo
# 3. Enable auto-sync (pull before push)

# Push current skills
agentools push --message "Initial setup"
```

### Daily Workflow

**User**: "Update all my skills"

**Assistant**:
```bash
# Pull latest from GitHub (auto-installs)
agentools pull
```

### Adding Custom Skills

**User**: "Add skills from my company repo"

**Assistant**:
```bash
# Add custom source
agentools source add https://github.com/company/ai-skills.git \
  --name company-skills \
  --branch main

# Update from new source (auto-installs)
agentools update --source company-skills
```

### Team Sharing

**User**: "Share my skills with team"

**Assistant**:
```bash
# Push to GitHub
agentools push --message "Added debugging skills"

# Team members pull (auto-installs)
agentools pull
```

## Architecture

### File Locations
- **Config**: `~/.agentools/config.json`
- **Sync Repo**: `~/.agentools/sync-repo/` (local clone)
- **Cache**: `~/.agentools-cache/` (external sources)

### Platform Paths
- Claude Code: `~/.claude/skills/`
- Antigravity: `~/.gemini/antigravity/skills/`
- Cursor: `~/.cursor/skills/`
- Windsurf: `~/.windsurf/skills/`
- Codex: `~/.codex/skills/`

## Configuration

Key config settings:

```json
{
  "repository": {
    "url": "https://github.com/username/skills.git",
    "branch": "main",
    "autoSync": true
  },
  "sources": {
    "official": [...],
    "custom": [...]
  }
}
```

## Examples

### Setup for Team

```bash
# Create shared repository
agentools init --repo https://github.com/team/shared-skills.git

# Add company skills
agentools source add https://github.com/company/official-skills.git \
  --name company

# Push setup
agentools push --message "Team setup complete"
```

### Migration

```bash
# Initialize agentools
agentools init --repo https://github.com/username/skills.git

# Install to all platforms
agentools install --force

# Push existing skills
agentools push --message "Migrated to agentools"
```

## Troubleshooting

### Skills Not Installing

```bash
# Force reinstall
agentools install --force

# Check platforms detected
agentools platforms
```

### GitHub Sync Conflicts

Auto-sync handles most conflicts automatically. If issues persist:

```bash
cd ~/.agentools/sync-repo
git status
```

### Config Issues

```bash
# Validate
agentools config validate

# Reset if corrupted
agentools config reset
```

## Tips

- **Auto-Sync**: Keep enabled to prevent conflicts
- **Regular Pulls**: Pull frequently for latest skills
- **Descriptive Messages**: Use `--message` for clear commit messages
- **Force Reinstall**: Use `--force` when skills aren't updating
