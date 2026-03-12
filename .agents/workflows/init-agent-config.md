---
description: Initialize .agents/config folder with AGENTS.md and secrets.yml for a new project
---

# Init Agent Config Workflow

// turbo-all

Set up the `.agents/config/` folder structure for a new project, including documentation and secret mapping config for Bitwarden → GitHub Actions sync.

## Steps

### 1. Create folder structure

```bash
mkdir -p .agents/config
```

### 2. Create AGENTS.md

Create `.agents/config/AGENTS.md` with the following content:

```markdown
# .agents/config

## secrets.yml

Defines mapping between GitHub Secrets/Variables and Bitwarden items.

**Format:**
```yaml
repo: <owner>/<repo-name>
environment: null  # or environment name
type: secret       # or "variable"

secrets:
  - name: GITHUB_SECRET_NAME    # Name on GitHub
    bitwarden: BITWARDEN_ITEM   # Item name in Bitwarden
```

**Purpose:** Enable automated secret sync from Bitwarden → GitHub using MCP tools.
```

### 3. Create secrets.yml

Create `.agents/config/secrets.yml` with the following content — update `repo` field with the actual GitHub repo:

```yaml
repo: owner/repo-name
environment: null
type: secret

secrets:
  # Add secrets below following this format:
  #
  # - name: GITHUB_SECRET_NAME       # Name of the secret on GitHub Actions
  #   bitwarden: BITWARDEN_ITEM_NAME # Bitwarden item name (Notes/SecureNote type)
  #
  # Example:
  # - name: DATABASE_URL
  #   bitwarden: MY_PROJECT_DATABASE_URL
```

### 4. Verify

```bash
ls -la .agents/config/
```

Expected output:
```
AGENTS.md
secrets.yml
```

## Notes

- All Bitwarden item values must be stored in the **Notes** field (SecureNote type)
- `environment: null` means repo-level secrets (not environment-scoped)
- Change `type: variable` if you need GitHub Variables instead of Secrets
