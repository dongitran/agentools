# MCP Servers - How to Create

## Structure

```
.agents/mcp-servers/
├── AGENTS.MD
├── <server-name>/
│   └── config.json
└── <another-server>/
    └── config.json
```

Each MCP server is a folder containing a `config.json` file.

## config.json Schema

```json
{
    "name": "server-name",
    "description": "Short description of the MCP server",
    "command": "npx",
    "args": ["-y", "@scope/package-name"],
    "bitwardenEnv": {
        "ENV_VAR_NAME": "BITWARDEN_ITEM_NAME"
    },
    "disabledTools": ["tool-to-disable"],
    "enabled": true
}
```

### Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Server name (must match folder name) |
| `description` | No | Short description |
| `command` | Yes | Run command (`npx`, `node`, `python`, ...) |
| `args` | Yes | Array of arguments |
| `bitwardenEnv` | No | Map `ENV_VAR` -> `BITWARDEN_ITEM_NAME`, secrets resolved via `agentools secrets sync` |
| `disabledTools` | No | Array of tool names to disable |
| `enabled` | No | `true`/`false`, defaults to `true` |

## Steps

1. Create folder: `.agents/mcp-servers/<name>/`
2. Create `config.json` inside that folder

## Example

```json
{
    "name": "notion",
    "description": "Notion MCP Server - Interact with Notion pages, databases, and content",
    "command": "npx",
    "args": ["-y", "@notionhq/notion-mcp-server"],
    "bitwardenEnv": {
        "NOTION_TOKEN": "NOTION_INTEGRATION_TOKEN"
    },
    "enabled": true
}
```

## Notes

- Folder name `bitwarden` is reserved and will be skipped
- `bitwardenEnv` maps env vars to Bitwarden vault item names, never store secrets directly
- Servers with `"enabled": false` are ignored during install and secret sync
- Do NOT create an `env` field in config.json
