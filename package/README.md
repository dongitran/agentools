<div align="center">

# 🤖 agentools

**Universal skill, workflow & rules manager for AI coding assistants — with bi-directional GitHub sync.**

[![npm version](https://img.shields.io/npm/v/agentools?style=flat-square&color=0ea5e9&label=npm)](https://www.npmjs.com/package/agentools)
[![npm downloads](https://img.shields.io/npm/dm/agentools?style=flat-square&color=8b5cf6)](https://www.npmjs.com/package/agentools)
[![License: MIT](https://img.shields.io/badge/license-MIT-22c55e?style=flat-square)](./LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-f59e0b?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)

<br/>

> Stop managing AI skills manually across multiple tools.  
> `agentools` syncs your skills, workflows, and rules from a single GitHub repo — across all your AI coding assistants.

</div>

---

## ✨ Features

- 🔄 **Bi-directional sync** — pull/push skills, workflows, and rules from your own GitHub repo
- 🌐 **Multi-platform** — Claude Code, Antigravity, Cursor, Windsurf, Codex CLI, GitHub Copilot
- 🔌 **External sources** — aggregate skills from any public GitHub repo
- 🔐 **Secret management** — sync MCP secrets from Bitwarden vault to your shell environment
- 📋 **Global rules** — manage AI behavior rules centrally, synced across all platforms
- 📁 **Local rules** — install project-level rule templates per repository
- ⚙️ **MCP auto-config** — auto-configures MCP servers (Bitwarden, etc.) on install

---

## 📦 Installation

```bash
npm install -g agentools
```

---

## 🚀 Quick Start

```bash
# Initialize with your GitHub repo
agentools init --repo https://github.com/youruser/my-ai-skills.git

# Pull skills and auto-install to all detected platforms
agentools pull

# Add an external skill source
agentools source add https://github.com/vercel-labs/agent-skills.git \
  --name vercel-labs --path skills

# Full sync: pull → sync external → push → install
agentools update
```

---

## 🛠️ Commands

| Command | Description |
|---------|-------------|
| `init --repo <url>` | Initialize config, clone repo, and install |
| `pull` | Git pull from repo + auto-install to platforms |
| `push [--message "msg"]` | Git push to your skills repo |
| `update` | Pull → sync external skills → push → install |
| `list` | List installed skills |
| `platforms` | Show detected platforms |
| `uninstall` | Remove installed skills |
| `source add <url>` | Add custom skill source |
| `source remove <name>` | Remove skill source |
| `source list` | List all sources |
| `source enable/disable <name>` | Toggle a source |
| `source info <name>` | View source details |
| `config get/set <key>` | Get or set a config value |
| `config edit` | Open config in `$EDITOR` |
| `config validate` | Validate configuration |
| `config export/import [file]` | Export or import configuration |
| `config reset --yes` | Reset to defaults |
| `secrets sync` | Sync MCP secrets from Bitwarden vault |
| `rules list` | List available local rule templates |
| `rules add <name>` | Install a local rule to current project |
| `rules status` | Show rules installed in current project |
| `version` | Show version |
| `help` | Show help |

---

## 🖥️ Supported Platforms

| Platform | Skills Path | MCP Support | Global Rules |
|----------|-------------|-------------|--------------|
| **Claude Code** | `~/.claude/skills/` | ✅ `~/.claude.json` | ✅ `~/.claude/rules/` |
| **Antigravity IDE** | `~/.gemini/antigravity/skills/` | ✅ `mcp_config.json` | ✅ `~/.gemini/GEMINI.md` |
| **Cursor** | `~/.cursor/skills/` | ✅ `~/.cursor/mcp.json` | ✅ `~/.cursor/rules/` |
| **Windsurf** | `~/.windsurf/skills/` | ✅ `mcp_config.json` | ✅ `global_rules.md` |
| **Codex CLI** | `~/.codex/skills/` | ✅ `~/.codex/config.toml` | ✅ `~/.codex/AGENTS.md` |
| **GitHub Copilot** | `~/.github/copilot-instructions.md` | ❌ | ❌ |

---

## ⚙️ How It Works

```
agentools pull / update
   ↓
GitHub repo  →  clone/pull  →  ~/.agentools/sync-repo/
   ↓
External sources (aggregated automatically)
   ↓
Install  →  Claude Code / Cursor / Windsurf / Antigravity / Codex
            Skills + Workflows + Global Rules + MCP config
```

**Skill structure in your repo:**
```
my-ai-skills/
├── .agents/
│   ├── skills/          # Your custom skills (SKILL.md per folder)
│   ├── workflows/       # Workflow markdown files
│   └── rules/
│       ├── global/      # Synced to all platforms automatically
│       └── local/       # Project-level templates (installed via `rules add`)
```

---

## 🔐 Secret Management

Securely sync MCP secrets from your Bitwarden vault to your shell environment:

```bash
agentools secrets sync
```

**How it works:**
- Scans MCP config files for placeholder variables (e.g., `${GITHUB_TOKEN}`)
- Fetches matching secrets from the Bitwarden vault folder **"MCP Secrets"**
- Writes exports to `~/.zshrc` for persistence across sessions
- Never stores your Bitwarden master password

---

## 📋 Global Rules

Manage AI behavior rules centrally and sync them across all platforms automatically.

**Setup:**
1. Create `.agents/rules/global/` in your sync-repo
2. Add `.md` rule files (e.g., `coding-standards.md`, `security.md`)
3. Run `agentools update` — rules are pushed to every platform

**Platform behavior:**
- **Folder-based** (Claude Code, Cursor): copies each `.md` individually
- **File-based** (Windsurf, Antigravity, Codex): merges all rules into one managed file with clear separators
- **Smart sync**: skips unchanged files to avoid unnecessary I/O

---

## 📁 Local Rules (Project-level)

Install project-specific rule templates to guide AI behavior per repository:

```bash
# See available templates
agentools rules list

# Install a template into the current project
agentools rules add react-nextjs-patterns

# Check what's installed
agentools rules status
```

Templates live in `.agents/rules/local/` in your sync-repo with YAML frontmatter metadata. The bundled `/select-local-rules` workflow can auto-detect your project stack and suggest relevant templates.

---

## ⚙️ Configuration

Config file at `~/.agentools/config.json`:

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
  "lastSync": "2026-01-01T00:00:00.000Z"
}
```

---

## 🧪 Development

```bash
git clone https://github.com/dongitran/agentools
cd agentools/package
npm install

npm test              # run unit tests
npm run test:coverage # tests with coverage report
```

---

## 📄 License

MIT © [dongitran](https://github.com/dongitran)
