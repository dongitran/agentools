# AI Agent Config

> CLI tool to manage AI coding skills, workflows & global rules across platforms (Claude Code, Antigravity, Cursor, Windsurf, Codex CLI)

**Version:** 2.9.0
**NPM:** https://www.npmjs.com/package/agentools
**Repository:** https://github.com/dongitran/agentools

> **IMPORTANT:** When making any changes to the `package/` folder, you MUST follow the [Development Workflow](#development-workflow-package-changes) below. This includes: bumping version, updating READMEs, running tests, pushing, waiting for CI via `gh` CLI, fixing failures, and self-testing.

---

## Project Structure

```
agentools/
├── package/                    # NPM package (published to npm)
│   ├── bin/cli.js              # CLI entry point
│   ├── scripts/
│   │   ├── config-manager.js   # Config CRUD (~/.agentools/config.json)
│   │   ├── external-sync.js    # Sync skills from external GitHub repos
│   │   ├── sync-manager.js     # Git push/pull to sync-repo
│   │   ├── installer.js        # Main installer (delegates to skill/mcp/rule installers)
│   │   ├── rules-installer.js  # Global rules merge & install logic
│   │   ├── mcp-installer.js    # MCP server discovery, validation, install
│   │   ├── secret-manager.js   # Bitwarden secret sync for MCP env vars
│   │   ├── platforms.js        # Platform detection (6 platforms)
│   │   ├── migration.js        # v1 -> v2 migration
│   │   └── postinstall.js      # Post-install guidance
│   ├── test/                   # Tests (node --test)
│   ├── config/
│   │   └── official-sources.json  # Empty (zero defaults)
│   └── package.json            # v2.8.0
├── .agents/
│   ├── skills/                 # 15 bundled skills (synced from external sources)
│   ├── workflows/              # 5 workflows (brainstorm, create-pr, release-notes, sync-bitwarden-to-github, update-skills)
│   ├── rules/
│   │   └── global/             # Global .md rules synced across platforms
│   ├── mcp-servers/            # MCP server configs (config.json per server)
│   └── external-skills.json    # External skill source definitions
├── .github/workflows/
│   ├── ci.yml                  # CI: test -> lint -> build -> publish (on package/ changes)
│   └── sync-external.yml       # Weekly auto-sync external skills (creates PR)
├── docs/                       # Project website (GitHub Pages)
├── plans/                      # Planning documents
├── AGENTS.md                   # This file
└── README.md                   # Project README
```

## Key Concepts

- **Skills**: Folders with `SKILL.md` that AI platforms auto-discover
- **Global Rules**: `.md` files in `.agents/rules/global/` synced to platform-specific rule files/folders
- **MCP Servers**: Configs in `.agents/mcp-servers/<name>/config.json` with `bitwardenEnv` for secret resolution
- **Sync-repo**: Local clone at `~/.agentools/sync-repo` used for git push/pull
- **External cache**: `~/.agentools-external-cache/` stores cloned external repos
- **Config**: `~/.agentools/config.json` stores user settings and sources
- **Zero dependencies**: Package uses only Node.js built-in modules (except `inquirer` for password prompt)

## CLI Commands

| Command | Description |
|---------|-------------|
| `init --repo <url>` | Initialize config, clone repo, and install |
| `push` / `pull` | Git push/pull with sync-repo (`pull` auto-installs) |
| `update` | Pull -> sync external skills -> push -> auto-install |
| `list` | List installed skills |
| `platforms` | Show detected platforms |
| `uninstall` | Remove installed skills |
| `source add/remove/list/enable/disable/info` | Manage skill sources |
| `config get/set/edit/validate/export/import/reset` | Manage config |
| `secrets sync` | Sync MCP secrets from Bitwarden vault |
| `sync-external` | Alias for `update` |
| `list-external` | List available external skills |
| `version` / `help` | Show version or help |

## Supported Platforms

| Platform | Skills Path | MCP Support | Global Rules |
|----------|-------------|-------------|--------------|
| Claude Code | `~/.claude/skills/` | `~/.claude.json` | `~/.claude/rules/` |
| Antigravity IDE | `~/.gemini/antigravity/skills/` | `mcp_config.json` | `GEMINI.md` |
| Cursor | `~/.cursor/skills/` | `~/.cursor/mcp.json` | `~/.cursor/rules/` |
| Windsurf | `~/.windsurf/skills/` | `mcp_config.json` | `global_rules.md` |
| Codex CLI | `~/.codex/skills/` | `config.toml` | `AGENTS.md` |
| GitHub Copilot | `~/.github/copilot-instructions.md` | - | - |

---

## Development Workflow (Package Changes)

When making changes to the `package/` folder, follow this workflow:

### 1. Make changes

Edit files in `package/` (cli.js, scripts, tests, etc.)

### 2. Update version

```bash
# In package/package.json - bump version
# Use semver: patch (bug fix), minor (new feature), major (breaking change)
```

### 3. Update documentation

- Update `README.md` (root) if CLI commands or features changed
- Update `package/README.md` if package-specific docs changed
- Update `AGENT.md` if architecture or structure changed

### 4. Run tests locally

```bash
cd package && npm test
```

### 5. Commit and push

```bash
git add package/ README.md AGENT.md
git commit -m "feat/fix/chore: description"
git push
```

### 6. Wait for CI and verify

```bash
# Check CI status
gh run list --limit 5

# Watch the latest run
gh run watch

# If CI fails, check logs
gh run view <run-id> --log-failed
```

### 7. Fix if CI fails

- Read the failed job logs
- Fix the issue
- Bump version again if needed (npm won't allow republishing same version)
- Commit, push, repeat from step 6

### 8. Verify published version

```bash
# After CI passes and publishes
npm install -g agentools@latest
agentools --version
```

### 9. Self-test

```bash
agentools init
agentools update
agentools list
agentools platforms
```

### 10. Create GitHub Release

After self-test passes, create a release describing what changed and what commands are affected:

```bash
gh release create v<version> --title "v<version>" --notes "$(cat <<'EOF'
## What's Changed

- <bullet points describing changes>

## Affected Commands

- `agentools <command>` — <what changed>

## Migration

<any breaking changes or steps users need to take, or "No migration needed.">
EOF
)"
```

---

## CI/CD Pipeline

**File:** `.github/workflows/ci.yml`
**Triggers:** Push/PR to `main` that changes `package/` folder

| Job | Description |
|-----|-------------|
| test | Run `npm test` on Node 22.x (Ubuntu, macOS, Windows) |
| lint | Verify package file structure |
| build | Create tarball artifact |
| publish | Publish to npm with provenance (main branch only) |

---

## External Skills Sync

**File:** `.github/workflows/sync-external.yml`
**Triggers:** Weekly (Sunday 00:00 UTC) or manual

Sources defined in `.agents/external-skills.json` (4 sources, 15 skills total).

The `update` command flow:
1. Pull sync-repo from GitHub
2. Clone/update external source repos to cache
3. Copy skills from cache to sync-repo
4. Commit and push sync-repo
5. Auto-install skills to IDE platforms
 