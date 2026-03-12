# Plan 04: Install MCP Servers to Claude Code

> Mở rộng lệnh `install` / `pull` để install MCP servers vào Claude Code, không chỉ Antigravity
> Claude Code dùng `claude_desktop_config.json` với format gần giống Antigravity

**Version**: v2.7.0
**Created**: 2026-02-14
**Status**: Draft
**Depends on**: [Plan 03](03-mcp-servers-with-bitwarden-env.md) (MCP + Bitwarden integration)

---

## Problem Statement

### Hiện trạng

MCP servers hiện chỉ được install vào **Antigravity IDE** (`~/.gemini/antigravity/mcp_config.json`). Code bị hardcode:

**`mcp-installer.js:118-125`** — `installMcpServers()`:
```javascript
function installMcpServers(options = {}) {
    const antigravity = platforms.getByName("antigravity");
    if (!antigravity || !antigravity.mcpConfigPath) {
        return { added: 0, skipped: 0, servers: [] };
    }
    // ... chỉ write vào antigravity
}
```

**`mcp-installer.js:193-197`** — `installMcpServersWithSecrets()`:
```javascript
function installMcpServersWithSecrets(resolvedSecrets) {
    const antigravity = platforms.getByName("antigravity");
    if (!antigravity || !antigravity.mcpConfigPath) {
        return { installed: 0, servers: [] };
    }
    // ... chỉ write vào antigravity
}
```

**`installer.js:236-243`** — `installToPlatform()`:
```javascript
// Install MCP servers (Antigravity only for now)
if (platform.name === "antigravity") {
    results.mcpServers = mcpInstaller.installMcpServers({ force });
}
```

### Claude Code MCP Format

Claude Code / Claude Desktop dùng file:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

Format:
```json
{
  "mcpServers": {
    "server-name": {
      "command": "/full/path/to/binary",
      "args": ["arg1", "arg2"],
      "env": {
        "ENV_VAR": "value"
      }
    }
  }
}
```

### So sánh format

| Aspect | Antigravity | Claude Code |
|--------|------------|-------------|
| File | `~/.gemini/antigravity/mcp_config.json` | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Root key | `mcpServers` | `mcpServers` |
| Server entry | `{ command, args, env, disabledTools }` | `{ command, args, env }` |
| disabledTools | Supported | **Không supported** |
| Command | `"npx"` (tìm trong PATH) | Thường dùng **absolute path** (vd: `/Users/x/.nvm/.../npx`) |
| Extra keys | - | `preferences` (UI settings — giữ nguyên, không touch) |

**Key difference**: Claude Code thường cần **absolute path** cho command vì nó spawn process riêng, không qua shell. Nếu dùng `"npx"` thì cần đảm bảo nó nằm trong PATH của Claude Code process.

---

## Design

### Approach: Multi-platform MCP writer

Refactor `mcp-installer.js` để support nhiều platforms thay vì hardcode Antigravity:

```
installMcpServers(options)
    └── Với mỗi platform có mcpConfigPath:
        ├── Antigravity → write to ~/.gemini/antigravity/mcp_config.json
        └── Claude Code  → write to ~/Library/Application Support/Claude/claude_desktop_config.json
```

### 1. Platform config update (`platforms.js`)

Thêm `mcpConfigPath` cho Claude Code platform:

```javascript
// Claude Code platform
{
    name: "claude",
    displayName: "Claude Code",
    // ...existing fields...
    get mcpConfigPath() {
        // Cross-platform support
        if (process.platform === "darwin") {
            return path.join(HOME, "Library", "Application Support", "Claude", "claude_desktop_config.json");
        } else if (process.platform === "win32") {
            return path.join(process.env.APPDATA || "", "Claude", "claude_desktop_config.json");
        } else {
            // Linux
            return path.join(HOME, ".config", "Claude", "claude_desktop_config.json");
        }
    },
}
```

### 2. MCP Installer refactor (`mcp-installer.js`)

#### 2a. Tách logic write thành function chung

```javascript
/**
 * Write MCP servers to a platform's config file
 * @param {string} configPath - Path to platform's MCP config file
 * @param {Array} servers - MCP server configs to install
 * @param {Object} options - { force, platformName }
 */
function writeMcpToPlatformConfig(configPath, servers, options = {}) {
    // Read existing config
    let config = { mcpServers: {} };
    if (fs.existsSync(configPath)) {
        try {
            config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
            if (!config.mcpServers) config.mcpServers = {};
        } catch {
            // Preserve non-mcpServers fields (like Claude's "preferences")
            config = { mcpServers: {} };
        }
    }

    // Merge servers
    for (const server of servers) {
        const existing = config.mcpServers[server.name];
        if (existing && !options.force) {
            // Skip existing
            continue;
        }

        const entry = {
            command: server.command,
            args: server.args,
        };

        // Preserve existing env
        if (existing && existing.env) {
            entry.env = existing.env;
        }

        // disabledTools: chỉ add cho platforms hỗ trợ (Antigravity)
        if (options.platformName !== "claude" && server.disabledTools?.length > 0) {
            entry.disabledTools = server.disabledTools;
        }

        config.mcpServers[server.name] = entry;
    }

    // Write back (tạo directory nếu chưa có)
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
}
```

#### 2b. Refactor `installMcpServers()` để support multi-platform

```javascript
function installMcpServers(options = {}) {
    const { force = false, platform = null } = options;

    const servers = getAvailableMcpServers().filter(s => s.enabled !== false);
    if (servers.length === 0) return { added: 0, skipped: 0, servers: [] };

    // Determine target platforms
    const targetPlatforms = [];
    if (platform) {
        // Single platform specified
        if (platform.mcpConfigPath) targetPlatforms.push(platform);
    } else {
        // All platforms with MCP support
        for (const p of platforms.detectAll()) {
            const full = platforms.getByName(p.name);
            if (full && full.mcpConfigPath) targetPlatforms.push(full);
        }
    }

    if (targetPlatforms.length === 0) {
        return { added: 0, skipped: 0, servers: [] };
    }

    // Install to each platform
    let totalAdded = 0, totalSkipped = 0;
    const serverNames = [...new Set(servers.map(s => s.name))];

    for (const p of targetPlatforms) {
        const result = writeMcpToPlatformConfig(p.mcpConfigPath, servers, {
            force,
            platformName: p.name,
        });
        totalAdded += result.added;
        totalSkipped += result.skipped;
    }

    return { added: totalAdded, skipped: totalSkipped, servers: serverNames };
}
```

#### 2c. Refactor `installMcpServersWithSecrets()` tương tự

Update để iterate qua tất cả platforms có `mcpConfigPath`, không chỉ Antigravity.

### 3. Installer update (`installer.js`)

Remove hardcode Antigravity check:

```javascript
// TRƯỚC:
if (platform.name === "antigravity") {
    results.mcpServers = mcpInstaller.installMcpServers({ force });
}

// SAU:
if (platform.mcpConfigPath) {
    results.mcpServers = mcpInstaller.installMcpServers({ force, platform: platformObj });
}
```

### 4. Xử lý edge cases

#### 4a. Claude Desktop `preferences` field

Claude Desktop config có thể chứa `preferences` key ngoài `mcpServers`. Khi write, **phải preserve tất cả existing keys**:

```javascript
// Read existing → CHỈ update mcpServers → write back toàn bộ
const existing = JSON.parse(fs.readFileSync(configPath));
existing.mcpServers = { ...existing.mcpServers, ...newServers };
fs.writeFileSync(configPath, JSON.stringify(existing, null, 2));
```

#### 4b. Command path resolution

Antigravity dùng shell nên `"npx"` hoạt động. Claude Code spawn process trực tiếp nên có thể cần absolute path. Tuy nhiên, nhiều config Claude Code hiện tại vẫn dùng `"npx"` / `"uv"` thành công nếu PATH đúng.

**Decision**: Giữ nguyên command từ config.json (`"npx"`). Nếu user gặp issue, họ có thể override trong config.json riêng. Không tự động resolve absolute path vì:
1. nvm path khác nhau mỗi machine
2. User có thể install npx ở nhiều nơi
3. Nếu npx nằm trong PATH thì không cần absolute path

#### 4c. Config file không tồn tại

Nếu `claude_desktop_config.json` chưa tồn tại (user chưa setup MCP nào):
- Tạo file mới với `{ "mcpServers": { ... } }`
- Tạo directory nếu cần (`~/Library/Application Support/Claude/`)

#### 4d. disabledTools

Claude Code không hỗ trợ `disabledTools`. Khi install vào Claude:
- **Bỏ qua** `disabledTools` field
- Vẫn install server, chỉ không có tool restriction

---

## Implementation Plan

### Files cần thay đổi

```
EDIT:   package/scripts/platforms.js        # Thêm mcpConfigPath cho Claude
EDIT:   package/scripts/mcp-installer.js    # Refactor multi-platform support
EDIT:   package/scripts/installer.js        # Remove Antigravity hardcode
EDIT:   package/bin/cli.js                  # Update output messages (optional)
EDIT:   package/test/mcp-installer.test.js  # Thêm tests cho Claude target
EDIT:   package/test/platforms.test.js      # Test mcpConfigPath cho Claude
```

### Phase 1: Platform config
1. **`platforms.js`**: Thêm `mcpConfigPath` getter cho Claude platform (cross-platform: macOS/Windows/Linux)

### Phase 2: MCP Installer refactor
2. **`mcp-installer.js`**: Tách `writeMcpToPlatformConfig()` thành function chung
3. **`mcp-installer.js`**: Refactor `installMcpServers()` — accept `platform` param, fallback to all detected platforms
4. **`mcp-installer.js`**: Refactor `installMcpServersWithSecrets()` — same multi-platform logic
5. **`mcp-installer.js`**: Handle `disabledTools` exclusion cho Claude
6. **`mcp-installer.js`**: Preserve non-mcpServers fields (like `preferences`) when writing

### Phase 3: Installer integration
7. **`installer.js`**: Replace `platform.name === "antigravity"` check with `platform.mcpConfigPath` check
8. **`installer.js`**: Pass platform object to `installMcpServers()`

### Phase 4: Tests
9. **`mcp-installer.test.js`**: Test install to Claude config path
10. **`mcp-installer.test.js`**: Test preserving existing Claude config fields (preferences)
11. **`mcp-installer.test.js`**: Test disabledTools NOT written for Claude
12. **`mcp-installer.test.js`**: Test installMcpServersWithSecrets for Claude
13. **`platforms.test.js`**: Test mcpConfigPath returns correct path per OS

### Phase 5: Packaging
14. Bump version to 2.7.0
15. Update docs (AGENTS.md, README if needed)
16. Follow AGENTS.md Development Workflow (test → commit → CI → verify → release)

---

## Test Cases

### New tests for mcp-installer.test.js

```javascript
describe("installMcpServers - Claude Code", () => {
    it("should install to Claude config when detected");
    it("should NOT include disabledTools for Claude");
    it("should preserve existing preferences in Claude config");
    it("should create config file if not exists");
    it("should handle corrupt Claude config gracefully");
    it("should skip existing servers without force");
    it("should overwrite with force");
});

describe("installMcpServersWithSecrets - Claude Code", () => {
    it("should write resolved env to Claude config");
    it("should preserve existing disabledTools from Antigravity but not Claude");
});

describe("writeMcpToPlatformConfig", () => {
    it("should preserve non-mcpServers keys");
    it("should create directory if not exists");
    it("should merge new servers with existing");
});
```

### New tests for platforms.test.js

```javascript
describe("Claude mcpConfigPath", () => {
    it("should return correct path for macOS");
    it("should return correct path for Windows");
    it("should return correct path for Linux");
});
```

---

## Backward Compatibility

| Feature | Trước (v2.6.x) | Sau (v2.7.0) | Breaking? |
|---------|----------------|--------------|-----------|
| `install` MCP | Chỉ Antigravity | Antigravity + Claude Code | No (additive) |
| `pull` auto-install MCP | Chỉ Antigravity | Antigravity + Claude Code | No (additive) |
| `secrets sync` MCP | Chỉ Antigravity | Antigravity + Claude Code | No (additive) |
| Antigravity `disabledTools` | Supported | Vẫn supported | No |
| Claude `disabledTools` | N/A | Bỏ qua (not supported) | No |
| Claude config khác fields | N/A | Preserved | No |
| `installMcpServers()` API | `(options)` | `(options)` + `platform` param | No (optional param) |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Write sai Claude config → mất preferences/MCP khác | Preserve ALL existing keys, chỉ merge `mcpServers` |
| `npx` command không work trong Claude | Giữ nguyên command từ repo config, user tự sửa nếu cần |
| Config file permissions | Respect existing file permissions, chỉ write nếu có quyền |
| Claude Desktop đang chạy → conflict | JSON write là atomic enough, Claude Desktop sẽ reload khi detect change |

---

## Open Questions

1. **Có cần auto-resolve `npx` → absolute path cho Claude không?**
   - Đề xuất: Không. Giữ simple, user override nếu cần. Nhiều Claude config hiện tại dùng `npx` thành công.

2. **Cursor/Windsurf MCP support?**
   - Đợi v2.8+. Cần research thêm format của từng platform.

3. **Có nên thêm `--platform` flag cho `install` để chọn target?**
   - Nice-to-have, nhưng current behavior (install to all detected) là hợp lý.

---

*Generated from codebase analysis on 2026-02-14*
