# agentools

> Universal skill, agent, workflow & global rules manager for AI coding assistants with bi-directional GitHub sync

[![npm version](https://badge.fury.io/js/agentools.svg)](https://www.npmjs.com/package/agentools)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

One command to manage AI coding skills and agents across Claude Code, Antigravity IDE, Antigravity CLI, Cursor, Windsurf, Codex CLI, and more.

## Quick Start

```bash
npm install -g agentools

# Initialize with your GitHub repo
agentools init --repo https://github.com/youruser/my-ai-skills.git

# Pull skills and agents from repo and auto-install to platforms
agentools pull

# Push local changes to repo
agentools push
```

## Add External Skills and Agents

```bash
# Add skill and agent sources from GitHub
agentools source add https://github.com/vercel-labs/agent-skills.git \
  --name vercel-labs --path skills

agentools source add https://github.com/affaan-m/everything-claude-code.git \
  --name everything-claude-code --path skills

# Sync and auto-install skills and agents to detected AI coding tools
agentools update
```

## CLI Commands

### GitHub Sync
```bash
agentools init --repo <url>              # Initialize with repository
agentools push [--message "msg"]         # Push skills and agents to GitHub
agentools pull                           # Pull from GitHub + auto-install skills and agents
```

### Source Management
```bash
agentools source add <url> [options]     # Add custom skill/agent source
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
# Pull/init auto-install uses your local sync repo directly; standalone installs retry bounded Git cache syncs.
agentools list                           # List installed skills and agents
agentools platforms                      # Show detected platforms
agentools uninstall                      # Remove installed skills and agents
agentools sync-external                  # Sync external skill/agent sources only
agentools list-external                  # List available external skills and agents
agentools version                        # Show version
agentools help                           # Show help
```

### Secret Management
```bash
agentools secrets sync                   # Sync MCP secrets from Bitwarden vault
```

### Local Rules (Project-level)
```bash
agentools rules list                     # List available local rule templates
agentools rules add <name>               # Install rule to .claude/rules/ + .agents/rules/
agentools rules status                   # Show rules installed in current project
```

Securely sync MCP secrets from Bitwarden vault to your shell profile. See [Bitwarden MCP Setup](./package/mcp-servers/bitwarden/README.md) for configuration.

## Supported Platforms

| Platform | Skills Path | MCP Support | Global Rules | Format |
|----------|-------------|-------------|--------------|--------|
| Claude Code | `~/.claude/skills/` | ✅ `~/.claude.json` | ✅ `~/.claude/rules/` | Folder |
| Antigravity IDE | `~/.gemini/antigravity/skills/` | ✅ `mcp_config.json` | ✅ `~/.gemini/GEMINI.md` | Single file |
| Antigravity CLI | `~/.gemini/antigravity-cli/skills/` | ✅ `~/.gemini/antigravity-cli/mcp_config.json` | ✅ `~/.gemini/GEMINI.md` | Single file |
| **Cursor** | `~/.cursor/skills/` | ✅ **`~/.cursor/mcp.json`** | ✅ `~/.cursor/rules/` | Folder |
| **Windsurf** | `~/.windsurf/skills/` | ✅ **`~/.codeium/windsurf/mcp_config.json`** | ✅ `global_rules.md` | Single file |
| **Codex CLI** | `~/.codex/skills/` | ✅ **`~/.codex/config.toml`** | ✅ `~/.codex/AGENTS.md` | Single file |
| GitHub Copilot | `~/.github/copilot-instructions.md` | ❌ | ❌ | - |

Antigravity CLI workflows are installed as slash-command skills under `~/.gemini/antigravity-cli/skills/<workflow>/SKILL.md`. On Windows, the global skills path is `%USERPROFILE%\.gemini\antigravity-cli\skills\`; the CLI binary is detected at its official `%LOCALAPPDATA%\agy\bin\agy.exe` location.

**New in v2.11.0:** First-class Antigravity CLI support for skills, workflows, MCP servers, and global rules on macOS, Linux, and Windows.

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
