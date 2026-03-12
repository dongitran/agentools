---
description: Update reset time for accounts in the Antigravity page on Notion
---

# Update Antigravity Reset Time

Workflow to update **Claude Token Quota Reset Time** for email accounts in the Antigravity Notion page.

> [!IMPORTANT]
> **Use MCP Notion tools only** — Do NOT use `bw` CLI or any external commands.
> Required MCP tools: `mcp_notion_API-post-search`, `mcp_notion_API-get-block-children`, `mcp_notion_API-delete-a-block`, `mcp_notion_API-patch-block-children`

> [!WARNING]
> Notion MCP has **no direct block update API**. The required approach is: **delete old block → insert new block** at the correct position.

---

## Steps

### 1. Identify accounts and time offsets

Receive from user:
- List of email accounts to update
- Time offset to add (e.g. `+4d 15h 18m`)

Compute new reset time = **current time** + requested offset.

> [!NOTE]
> Use the current time from request metadata. Output format: `YYYY-MM-DD HH:MM:SS (UTC+7)`

### 2. Find the Antigravity page on Notion

Use **MCP Notion** — call `mcp_notion_API-post-search` to locate the page:

```
Tool: mcp_notion_API-post-search
Params: { "query": "antigravity" }
```

Extract the `page_id` from the result (e.g. `30760e25-eedd-81fd-b603-eeaaec0f2308`).

### 3. Read all page blocks

```
Tool: mcp_notion_API-get-block-children
Params: { "block_id": "<page_id>" }
```

From the result, identify for each target email:
- **Heading block ID** (`heading_3`) containing the email address
- **Bullet block ID** (`bulleted_list_item`) immediately after the heading — this is the "Reset time: ..." block to replace

### 4. Delete old bullet blocks

For each email to update, delete its existing reset time bullet:

```
Tool: mcp_notion_API-delete-a-block
Params: { "block_id": "<bullet_block_id>" }
```

Multiple blocks can be deleted in parallel.

### 5. Insert new bullet blocks with updated reset time

Use `mcp_notion_API-patch-block-children` with the `after` parameter to insert the new block **immediately after the corresponding heading**:

```
Tool: mcp_notion_API-patch-block-children
Params:
  block_id: <page_id>
  after: <heading_block_id>
  children:
    - type: bulleted_list_item
      bulleted_list_item:
        rich_text:
          - type: text
            text: { content: "Reset time: " }
            annotations: { bold: true }
          - type: text
            text: { content: "YYYY-MM-DD HH:MM:SS (UTC+7)" }
            annotations: { color: "green" }
```

> [!NOTE]
> The `after` parameter takes the **heading block ID** — the new block will be inserted right after that heading, preserving the correct page order.

### 6. Verify

Re-read the page to confirm:

```
Tool: mcp_notion_API-get-block-children
Params: { "block_id": "<page_id>" }
```

Check:
- ✅ Each email heading → new "Reset time: ..." bullet appears directly below it
- ✅ Reset time text is displayed in green
- ✅ Old blocks are no longer present

---

## Example

**Request:** Update `dongtranidea02@gmail.com` with `+4d 15h 18m` from `2026-03-10 08:23:47 (UTC+7)`

**New reset time:** `2026-03-14 23:41:47 (UTC+7)`

**Flow:**
1. `mcp_notion_API-post-search` → query: "antigravity"
2. `mcp_notion_API-get-block-children` → extract block IDs
3. `mcp_notion_API-delete-a-block` → delete old bullet for `dongtranidea02`
4. `mcp_notion_API-patch-block-children` → insert new bullet after `dongtranidea02` heading with `"2026-03-14 23:41:47 (UTC+7)"`
5. `mcp_notion_API-get-block-children` → confirm result
