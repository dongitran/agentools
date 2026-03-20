---
description: Analyze current project and auto-select relevant local rules to install into project-level rule files for Claude Code and Antigravity
---

# Select & Install Local Rules

> This workflow analyzes your current project context and intelligently picks rules from your team's rule library (`.agents/rules/local/`), then installs them into your project.

// turbo-all

## Phase 1: Discover Available Rules

Read all rule files from the local rules library in the sync-repo:
- Path: `~/.agentools/sync-repo/.agents/rules/local/` (if user uses agentools sync-repo)
- Fallback: `~/.agentools-cache/.agents/rules/local/` (cached from agentools package)

For each `.md` file found, read its YAML frontmatter and extract:
- `name`: Rule identifier
- `description`: What the rule covers
- `tags`: Technology tags (react, nestjs, postgres, etc.)
- `triggers`: Auto-detection signals (file patterns, package names)

If no local rules found, inform the user:
```
⚠️ No local rules found. Add rule files to .agents/rules/local/ in your sync-repo.
See: https://github.com/dongitran/agentools#local-rules
```

## Phase 2: Analyze Project Context

Scan the current working directory for context signals:

**Package detection** — Read `package.json` if it exists:
- `dependencies` and `devDependencies`: detect frameworks, databases, test runners
- Key packages to detect: `next`, `react`, `@nestjs/core`, `prisma`, `pg`, `typeorm`, `jest`, `vitest`, `@playwright/test`

**Config files** — Check for existence:
- `next.config.js` / `next.config.ts` → Next.js project
- `nest-cli.json` → NestJS project
- `prisma/schema.prisma` → Prisma ORM
- `jest.config.*` / `vitest.config.*` → Testing setup
- `docker-compose.yml` → Docker
- `tsconfig.json` → TypeScript

**Existing rules** — Check what's already installed to avoid duplicates:
- `.claude/rules/` — Claude Code project rules
- `.agents/rules/` — Antigravity project rules

## Phase 3: Pick Rules & Confirm

Match detected signals against each rule's `triggers` field to recommend rules.

Present a clear selection to the user:

```
📁 Local Rules Library: <N> rules available

✅ RECOMMENDED (auto-detected):
  • react-nextjs-patterns.md — detected: next.config.ts, "next" in package.json
  • testing-patterns.md     — detected: jest.config.ts, "jest" in devDependencies

⬜ AVAILABLE (not detected, but you can add):
  • nestjs-backend-patterns.md — NestJS backend patterns
  • postgres-patterns.md       — PostgreSQL query & schema patterns
  • nodejs-performance.md      — Node.js async & performance patterns

Install recommended rules? [Y/n]
Or enter rule names manually (comma-separated):
```

Wait for user confirmation before proceeding. Options:
- **Y / yes**: Install all recommended rules
- **n / no**: Cancel
- **all**: Install ALL available rules regardless of detection
- **manual**: User lists specific rule names to install

## Phase 4: Install Rules

For each selected rule file, install to **project-level** paths (NOT user-level):

### Claude Code (`.claude/rules/`)
```
<current-project>/.claude/rules/<rule-filename>.md
```
- Create `.claude/rules/` directory if it doesn't exist
- Check if file already exists → ask user to overwrite or skip
- Copy rule file content (strip YAML frontmatter before writing)

### Antigravity (`.agents/rules/`)
```
<current-project>/.agents/rules/<rule-filename>.md
```
- Create `.agents/rules/` directory if it doesn't exist
- Check if file already exists → ask user to overwrite or skip
- Copy rule file content (strip YAML frontmatter before writing)

> **Note on YAML frontmatter**: Strip the `---` frontmatter block from the copied content — platforms only need the rule content, not the metadata.

## Phase 5: Summary & Next Steps

After installation, show a summary:

```
✅ Rules installed successfully!

📁 Claude Code rules:  .claude/rules/
  • react-nextjs-patterns.md
  • testing-patterns.md

📁 Antigravity rules:  .agents/rules/
  • react-nextjs-patterns.md
  • testing-patterns.md

💡 Next steps:
  1. Review installed rules: ls .claude/rules/ .agents/rules/
  2. Commit to your project repo:
     git add .claude/rules/ .agents/rules/
     git commit -m "chore: add project-level AI coding rules"
  3. To add more rules later, run this workflow again or use:
     agentools rules add <rule-name>
```

---

## Reference: Rule File Format

Local rules use YAML frontmatter for metadata:

```markdown
---
name: my-rule-name
description: Short description of what this rule covers
tags: [react, typescript, frontend]
triggers:
  - file: next.config.ts      # check if this file exists in project
  - package: next              # check if in package.json dependencies
---

# Rule Content Here

...actual rule content...
```
