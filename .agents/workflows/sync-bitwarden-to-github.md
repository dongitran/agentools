---
description: Sync secrets from Bitwarden vault to GitHub repository secrets/variables based on .agents/config/secret.yml
---

# Sync Bitwarden Secrets to GitHub Workflow

// turbo-all

Read `.agents/config/secret.yml`, fetch values from Bitwarden using **MCP Bitwarden**, and sync to GitHub repo secrets/variables.

## Secret Config Format

```yaml
repo: owner/repo-name
environment: null          # GitHub environment name (null = repo-level)
type: secret               # "secret" or "variable"

secrets:
  - name: SECRET_NAME              # GitHub secret/variable name
    bitwarden: BITWARDEN_ITEM_NAME # Bitwarden item name (Notes type)
```

## Steps

### 1. Read and parse config

Read `.agents/config/secret.yml` and extract:
- `repo` - target GitHub repository
- `environment` - GitHub environment (null = repo-level)
- `type` - "secret" or "variable"
- `secrets[].bitwarden` - all Bitwarden item names to fetch

### 2. Verify MCP Bitwarden is configured

Ensure `mcp_config.json` has the Bitwarden MCP server configured with these **environment variables**:
- `BW_SESSION` - authenticated session token (already unlocked)
- `BW_CLIENT_ID` - OAuth client ID  
- `BW_CLIENT_SECRET` - OAuth client secret

MCP Bitwarden uses these environment variables for authentication (no CLI needed).

> [!IMPORTANT]
> MCP Bitwarden handles authentication automatically via environment variables. No manual login/unlock steps needed.

### 3. Fetch all secrets from Bitwarden

For each `bitwarden` item in config, use MCP tools to fetch the Notes value:

**Search for item by name:**
Use `search_bitwarden_items` or `get_bitwarden_item` to retrieve the item.

**Extract the Notes field:**
All secret values are stored in the **Notes** field of Bitwarden items (SecureNote type).

Example MCP tool usage:
- Tool: `mcp_bitwarden_get` with `object: "notes"` and `id: "ITEM_NAME"`
- Or: `mcp_bitwarden_list` with `type: "items"` and `search: "ITEM_NAME"` to find the item, then extract notes

### 4. Set GitHub secrets/variables

Verify gh CLI is authenticated:

```bash
gh auth status
```

For `type: secret` - set GitHub secrets:

```bash
gh secret set SECRET_NAME --repo owner/repo --body "VALUE"
```

For `type: variable` - set GitHub variables:

```bash
gh variable set VAR_NAME --repo owner/repo --body "VALUE"
```

If `environment` is specified, add `--env ENV_NAME`:

```bash
gh secret set SECRET_NAME --repo owner/repo --env ENV_NAME --body "VALUE"
gh variable set VAR_NAME --repo owner/repo --env ENV_NAME --body "VALUE"
```

## Notes

- **Use MCP Bitwarden tools only** - No `bw` CLI commands
- MCP tools available: `mcp_bitwarden_get`, `mcp_bitwarden_list`, `mcp_bitwarden_create_item`
- All Bitwarden items use **Notes** field for the secret value
- Use `--env` flag only when `environment` is not null
- Secrets are set one by one - if one fails, continue with remaining and report errors at the end
- Never log or display secret values in output
- If a Bitwarden item is not found, warn and skip (do not abort entire sync)

## MCP Bitwarden Key Commands

- **Get item notes**: `mcp_bitwarden_get` with `object: "notes"` and `id: "ITEM_NAME"`
- **Search items**: `mcp_bitwarden_list` with `type: "items"` and `search: "ITEM_NAME"`
- **Get specific item**: Use item ID from search results to retrieve full details
