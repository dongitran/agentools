# Plan 05: Mở Rộng MCP Multi-Platform

**Version**: v2.8.0 | **Date**: 2026-02-15 | **Status**: Ready for Implementation

---

## 🎯 Mục Tiêu

Mở rộng khả năng install MCP servers từ **2 platforms** (Claude Code, Antigravity) lên **5 platforms**:

- ✅ Claude Code (đã có)
- ✅ Antigravity (đã có)
- ➕ **Cursor** - NEW
- ➕ **Windsurf** - NEW
- ➕ **Codex CLI** - NEW

---

## 🔍 Research Findings

### 1. Cursor
- **Config**: `~/.cursor/mcp.json` (JSON format)
- **Format**: Giống Claude Code (`mcpServers` key)
- **Đặc điểm**: Không hỗ trợ `disabledTools`

```json
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "@scope/package"],
      "env": { "API_KEY": "value" }
    }
  }
}
```

### 2. Windsurf
- **Config**: `~/.codeium/windsurf/mcp_config.json` (JSON format)
- **Đặc điểm**: Dùng field `disabled` (boolean) thay vì `enabled`

```json
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "@scope/package"],
      "env": { "API_KEY": "value" },
      "disabled": false
    }
  }
}
```

### 3. Codex CLI
- **Config**: `~/.codex/config.toml` (**TOML format** - khác JSON!)
- **Project config**: `.codex/config.toml` (trusted projects)
- **Đặc điểm**: Cấu trúc `[mcp_servers.<name>]` (underscore, không phải dot!)

```toml
# Note: Section name dùng underscore: mcp_servers (không phải mcp.servers)
[mcp_servers.server-name]
command = "npx"
args = ["-y", "@scope/package"]

# Environment variables (có 2 cách)
# Cách 1: Inline table
env = { "API_KEY" = "value" }

# Cách 2: Section riêng
[mcp_servers.server-name.env]
API_KEY = "value"
```

**Supported fields**:
- `command`, `args` (required for STDIO servers)
- `url` (for HTTP servers)
- `env` (inline table hoặc section)
- `enabled`, `required`, `enabled_tools`, `disabled_tools`
- `startup_timeout_sec`, `tool_timeout_sec`

---

## 📦 Implementation Plan

### **Phase 1: Update Platform Detection**

**File**: `package/scripts/platforms.js`

**Changes**:
1. **Cursor**: Thêm `mcpConfigPath: ~/.cursor/mcp.json`
2. **Windsurf**: Thêm `mcpConfigPath: ~/.codeium/windsurf/mcp_config.json`
3. **Codex CLI**: Thêm platform mới với `mcpConfigFormat: "toml"`

```javascript
// Cursor platform
{
  name: "cursor",
  mcpConfigPath: path.join(os.homedir(), ".cursor", "mcp.json"),
  // ... existing fields
}

// Windsurf platform
{
  name: "windsurf",
  mcpConfigPath: path.join(os.homedir(), ".codeium", "windsurf", "mcp_config.json"),
  // ... existing fields
}

// Codex CLI platform (NEW)
{
  name: "codex",
  mcpConfigPath: path.join(os.homedir(), ".codex", "config.toml"),
  mcpConfigFormat: "toml",  // ← Key difference
  // ... other fields
}
```

---

### **Phase 2: MCP Installer Updates**

**File**: `package/scripts/mcp-installer.js`

#### 2.1 Add TOML Support

**Install dependency**:
```bash
npm install @iarna/toml --save
```

**New functions**:
```javascript
// 1. Detect config format
function getConfigFormat(platformName) {
  const platform = platforms.SUPPORTED.find(p => p.name === platformName);
  return platform?.mcpConfigFormat || "json";
}

// 2. Read config (JSON or TOML)
function readPlatformConfig(configPath, format) {
  if (format === "toml") {
    return toml.parse(fs.readFileSync(configPath, "utf8"));
  }
  return JSON.parse(fs.readFileSync(configPath, "utf8"));
}

// 3. Write config (JSON or TOML)
function writePlatformConfig(configPath, config, format) {
  const content = format === "toml"
    ? toml.stringify(config)
    : JSON.stringify(config, null, 2);

  fs.writeFileSync(configPath, content, "utf8");
  fs.chmodSync(configPath, 0o600);
}
```

#### 2.2 Platform-Specific Config Builder

```javascript
function buildServerConfig(server, platformName) {
  const config = {
    command: server.command,
    args: server.args,
    ...(server.env && { env: server.env })
  };

  // Platform-specific fields
  if (platformName === "antigravity" && server.disabledTools) {
    config.disabledTools = server.disabledTools;
  }

  if (platformName === "windsurf" && server.enabled !== undefined) {
    config.disabled = !server.enabled;
  }

  return config;
}
```

#### 2.3 Update Main Write Function

```javascript
function writeMcpToPlatformConfig(configPath, servers, options = {}) {
  const { platformName } = options;
  const format = getConfigFormat(platformName);

  let existingConfig = readPlatformConfig(configPath, format);
  const mcpServers = {};

  for (const server of servers) {
    mcpServers[server.name] = buildServerConfig(server, platformName);
  }

  // Merge logic (IMPORTANT: TOML dùng mcp_servers với underscore!)
  const finalConfig = format === "toml"
    ? {
        ...existingConfig,
        mcp_servers: {  // ← underscore, không phải dot!
          ...(existingConfig.mcp_servers || {}),
          ...mcpServers
        }
      }
    : {
        ...existingConfig,
        mcpServers: { ...(existingConfig.mcpServers || {}), ...mcpServers }
      };

  writePlatformConfig(configPath, finalConfig, format);
}
```

---

### **Phase 3: Testing**

**Unit Tests** (`package/test/mcp-installer.test.js`):

```javascript
describe('MCP Multi-Platform', () => {
  it('should install to Cursor with JSON format');
  it('should install to Windsurf with disabled field');
  it('should install to Codex CLI with TOML format');
  it('should preserve existing config for all platforms');
  it('should detect format correctly (json vs toml)');
});
```

**Manual Testing Checklist**:
- [ ] Cursor: MCP install tạo `~/.cursor/mcp.json`
- [ ] Windsurf: MCP install tạo `~/.codeium/windsurf/mcp_config.json`
- [ ] Codex CLI: MCP install tạo `~/.codex/config.toml`
- [ ] Secrets sync hoạt động với cả 3 platforms
- [ ] `agentools install --force` update tất cả 5 platforms

---

### **Phase 4: Documentation**

**README.md** - Update platform matrix:

| Platform | Skills | MCP | Config Path |
|----------|--------|-----|-------------|
| Claude Code | ✅ | ✅ | `~/Library/.../claude_desktop_config.json` |
| Antigravity | ✅ | ✅ | `~/.gemini/antigravity/mcp_config.json` |
| **Cursor** | ✅ | **✅ NEW** | `~/.cursor/mcp.json` |
| **Windsurf** | ✅ | **✅ NEW** | `~/.codeium/windsurf/mcp_config.json` |
| **Codex CLI** | ✅ | **✅ NEW** | `~/.codex/config.toml` |
| GitHub Copilot | ✅ | ❌ | `~/.github/copilot-instructions.md` |

**CHANGELOG.md**:
```markdown
## [2.8.0] - 2026-02-15

### Added
- 🎉 MCP support for Cursor (`~/.cursor/mcp.json`)
- 🎉 MCP support for Windsurf (`~/.codeium/windsurf/mcp_config.json`)
- 🎉 MCP support for Codex CLI (`~/.codex/config.toml` - TOML format)
- TOML parser for Codex CLI configs

### Changed
- MCP-capable platforms: 2 → 5
- Enhanced platform-specific field handling
```

---

## ⚠️ Risk Assessment

### ✅ Low Risk
- Cursor/Windsurf dùng JSON format (giống Claude/Antigravity)
- Platform detection đơn giản (check directory)
- Backward compatible (không breaking changes)

### ⚠️ Medium Risk
- **TOML parsing**: Dependency mới `@iarna/toml`
  - *Mitigation*: Library phổ biến (>1M downloads/week)
  - *Mitigation*: Add comprehensive tests
- **TOML section naming**: Phải dùng `mcp_servers` (underscore), KHÔNG phải `mcp.servers` (dot)
  - *Mitigation*: Test với real config và validate syntax

### ✅ Low Risk (Updated)
- **Codex CLI config path**: ✅ **CONFIRMED** từ official docs
  - Path: `~/.codex/config.toml` (user-level)
  - Project: `.codex/config.toml` (trusted projects only)
  - Override: `CODEX_HOME` environment variable
  - Source: [Official Codex Docs](https://developers.openai.com/codex/config-basic/)

---

## ✅ Implementation Checklist

### Phase 1: Platform Detection
- [ ] Update Cursor platform với `mcpConfigPath`
- [ ] Update Windsurf platform với `mcpConfigPath`
- [ ] Add Codex CLI platform với `mcpConfigFormat: "toml"`

### Phase 2: MCP Installer
- [ ] Install `@iarna/toml` dependency
- [ ] Add `getConfigFormat()`, `readPlatformConfig()`, `writePlatformConfig()`
- [ ] Add `buildServerConfig()` với platform-specific logic
- [ ] Update `writeMcpToPlatformConfig()` cho format-aware

### Phase 3: Testing
- [ ] Unit tests cho 3 platforms mới
- [ ] Manual testing trên Cursor/Windsurf/Codex CLI
- [ ] Test secrets sync với Bitwarden

### Phase 4: Documentation
- [ ] Update README platform matrix
- [ ] Update CHANGELOG
- [ ] Add platform-specific config examples

### Phase 5: Code Review & Self-Improvement
- [ ] Review toàn bộ code đã implement (platforms.js, mcp-installer.js)
- [ ] Kiểm tra code quality, naming conventions, comments
- [ ] Tự đánh giá: Code có dễ đọc, maintainable không?
- [ ] Tìm edge cases chưa handle (empty config, malformed TOML, etc.)
- [ ] Refactor nếu cần để improve code structure
- [ ] Verify error handling đầy đủ (file not found, parse errors)
- [ ] Check backward compatibility với existing platforms
- [ ] Run static analysis (eslint, type checking nếu có)

---

## 📊 Platform Comparison

| Feature | Claude | Antigravity | Cursor | Windsurf | Codex |
|---------|--------|-------------|--------|----------|-------|
| **Format** | JSON | JSON | JSON | JSON | **TOML** |
| **MCP Key** | `mcpServers` | `mcpServers` | `mcpServers` | `mcpServers` | `[mcp_servers.*]` |
| **disabledTools** | ❌ | ✅ | ❌ | ❌ | ✅ `disabled_tools` |
| **disabled** | ❌ | ❌ | ❌ | ✅ | ❌ |
| **enabled** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **env vars** | ✅ | ✅ | ✅ | ✅ | ✅ (inline or section) |

---

## 🔮 Future Work

### Post-v2.8.0
- **ChatGPT Codex**: Clarify nếu khác với Codex CLI
- **Project-level configs**: Support Cursor `.cursor/mcp.json` (project scope)
- **MCP Marketplace**: Auto-discovery community MCP servers

---

## 📚 References

**Cursor**:
- [Cursor MCP Setup Guide](https://claudefa.st/blog/tools/mcp-extensions/cursor-mcp-setup)
- [Microsoft Azure MCP + Cursor](https://learn.microsoft.com/en-us/azure/developer/azure-mcp-server/get-started/tools/cursor)

**Windsurf**:
- [Windsurf MCP Docs](https://docs.windsurf.com/windsurf/cascade/mcp)
- [Windsurf MCP Setup 2026](https://www.braingrid.ai/blog/windsurf-mcp)

**Codex CLI**:
- [Config Basics](https://developers.openai.com/codex/config-basic/) - Config location
- [Config Reference](https://developers.openai.com/codex/config-reference/) - All config keys
- [MCP Guide](https://developers.openai.com/codex/mcp/) - MCP server setup
- [GitHub Repo](https://github.com/openai/codex) - Source code
- [Community Guide](https://vladimirsiedykh.com/blog/codex-mcp-config-toml-shared-configuration-cli-vscode-setup-2025) - Real examples

---

**Prepared by**: Claude Sonnet 4.5
**Status**: ✅ Ready for Implementation
**Next**: Begin Phase 1 - Platform Detection Updates
