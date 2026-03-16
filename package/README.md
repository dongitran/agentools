# agentools

> Universal skill & workflow manager for AI coding assistants with bi-directional GitHub sync

[![npm version](https://badge.fury.io/js/agentools.svg)](https://www.npmjs.com/package/agentools)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Install

```bash
npm install -g agentools
```

## Quick Start

```bash
# Initialize with your GitHub repo
agentools init --repo https://github.com/youruser/my-ai-skills.git

# Pull skills and auto-install to platforms
agentools pull

# Add external skill sources
agentools source add https://github.com/vercel-labs/agent-skills.git \
  --name vercel-labs --path skills

# Sync external skills (pull -> sync -> push)
agentools update
```

## Commands

| Command | Description |
|---------|-------------|
| `init --repo <url>` | Initialize config, clone repo, and install |
| `push [--message "msg"]` | Git push to your skills repo |
| `pull` | Git pull from repo + auto-install |
| `update` | Pull → sync external skills → push → install |
| `list` | List installed skills |
| `platforms` | Show detected platforms |
| `uninstall` | Remove installed skills |
| `source add <url>` | Add custom skill source |
| `source remove <name>` | Remove skill source |
| `source list` | List all sources |
| `source enable <name>` | Enable a source |
| `source disable <name>` | Disable a source |
| `source info <name>` | View source details |
| `config get <key>` | Get config value |
| `config set <key> <value>` | Set config value |
| `config edit` | Open config in $EDITOR |
| `config validate` | Validate configuration |
| `config export [file]` | Export configuration |
| `config import [file]` | Import configuration |
| `config reset --yes` | Reset to defaults |
| `secrets sync` | Sync MCP secrets from Bitwarden vault |
| `sync-external` | Alias for `update` |
| `list-external` | List available external skills |
| `version` | Show version |
| `help` | Show help |

## Supported Platforms

| Platform | Skills Path | MCP Support | Format |
|----------|-------------|-------------|--------|
| Claude Code | `~/.claude/skills/` | ✅ `~/.claude.json` | JSON |
| Antigravity IDE | `~/.gemini/antigravity/skills/` | ✅ `mcp_config.json` | JSON |
| **Cursor** | `~/.cursor/skills/` | ✅ **`~/.cursor/mcp.json`** | JSON |
| **Windsurf** | `~/.windsurf/skills/` | ✅ **`~/.codeium/windsurf/mcp_config.json`** | JSON |
| **Codex CLI** | `~/.codex/skills/` | ✅ **`~/.codex/config.toml`** | **TOML** |
| GitHub Copilot | `~/.github/copilot-instructions.md` | ❌ | - |

**New in v2.8.0:** MCP server support for Cursor, Windsurf, and Codex CLI!

## Secret Management

Securely sync MCP secrets from Bitwarden vault to your shell profile:

```bash
agentools secrets sync
```

**How it works:**
- Discovers required secrets from MCP config files (e.g., `${GITHUB_TOKEN}`)
- Fetches secrets from Bitwarden vault folder "MCP Secrets"
- Writes to `~/.zshrc` for persistence across sessions
- Never stores Bitwarden master password

**Setup:** See [Bitwarden MCP Setup Guide](./mcp-servers/bitwarden/README.md)

**Auto-configuration:** Package automatically configures Bitwarden MCP server in Antigravity on install

## Configuration

User config at `~/.agentools/config.json`:

```json
{
  "version": "2.5",
  "repository": {
    "url": "https://github.com/youruser/my-ai-skills.git",
    "branch": "main",
    "local": "/Users/you/.agentools/sync-repo"
  },
  "sources": [
    {
      "name": "vercel-labs",
      "url": "https://github.com/vercel-labs/agent-skills.git",
      "enabled": true
    }
  ],
  "lastSync": "2026-02-13T12:00:00.000Z"
}
```

## License

MIT
