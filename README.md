# agentools

> Universal skill, workflow & global rules manager for AI coding assistants with bi-directional GitHub sync

[![npm version](https://badge.fury.io/js/agentools.svg)](https://www.npmjs.com/package/agentools)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

One command to manage AI coding skills across Claude Code, Antigravity, Cursor, Windsurf, Codex CLI, and more.

## Quick Start

```bash
npm install -g agentools

# Initialize with your GitHub repo
agentools init --repo https://github.com/youruser/my-ai-skills.git

# Pull skills from repo and auto-install to platforms
agentools pull

# Push local changes to repo
agentools push
```

## Add External Skills

```bash
# Add skill sources from GitHub
agentools source add https://github.com/vercel-labs/agent-skills.git \
  --name vercel-labs --path skills

agentools source add https://github.com/affaan-m/everything-claude-code.git \
  --name everything-claude-code --path skills

# Sync and auto-install to IDEs
agentools update
```

## CLI Commands

### GitHub Sync
```bash
agentools init --repo <url>              # Initialize with repository
agentools push [--message "msg"]         # Push skills to GitHub
agentools pull                           # Pull from GitHub + auto-install
```

### Source Management
```bash
agentools source add <url> [options]     # Add custom source
agentools source remove <name>           # Remove source
agentools source list                    # List all sources
agentools source enable/disable <name>   # Toggle source
agentools source info <name>             # View source details
```

### Config Management
```bash
agentools config get/set <key> [value]   # Get or set config
agentools config edit                    # Open in $EDITOR
agentools config validate                # Validate config
agentools config export/import [file]    # Export or import config
agentools config reset --yes             # Reset to defaults
```

### Installation
```bash
agentools update                         # Update from all sources (pull -> sync -> push -> install)
agentools list                           # List installed skills
agentools platforms                      # Show detected platforms
agentools uninstall                      # Remove installed skills
agentools sync-external                  # Alias for update
agentools list-external                  # List available external skills
agentools version                        # Show version
agentools help                           # Show help
```

### Secret Management
```bash
agentools secrets sync                   # Sync MCP secrets from Bitwarden vault
```

Securely sync MCP secrets from Bitwarden vault to your shell profile. See [Bitwarden MCP Setup](./package/mcp-servers/bitwarden/README.md) for configuration.

## Supported Platforms

| Platform | Skills Path | MCP Support | Global Rules | Format |
|----------|-------------|-------------|--------------|--------|
| Claude Code | `~/.claude/skills/` | ✅ `~/.claude.json` | ✅ `~/.claude/rules/` | Folder |
| Antigravity IDE | `~/.gemini/antigravity/skills/` | ✅ `mcp_config.json` | ✅ `~/.gemini/GEMINI.md` | Single file |
| **Cursor** | `~/.cursor/skills/` | ✅ **`~/.cursor/mcp.json`** | ✅ `~/.cursor/rules/` | Folder |
| **Windsurf** | `~/.windsurf/skills/` | ✅ **`~/.codeium/windsurf/mcp_config.json`** | ✅ `global_rules.md` | Single file |
| **Codex CLI** | `~/.codex/skills/` | ✅ **`~/.codex/config.toml`** | ✅ `~/.codex/AGENTS.md` | Single file |
| GitHub Copilot | `~/.github/copilot-instructions.md` | ❌ | ❌ | - |

**New in v2.9.1:** Smart sync for Global Rules — always up to date without needing `--force`.

## File Locations

```
~/.agentools/config.json                 # User configuration
~/.agentools/sync-repo/                  # Local git clone for sync
~/.agentools-external-cache/             # Cached external repos
```

## Team Sharing

```bash
# Export your config
agentools config export team-config.json

# Team members import
agentools config import team-config.json --merge
```

## License

MIT
