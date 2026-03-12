# Plan: MCP Servers Sync Feature

> Thêm khả năng sync MCP servers cho Antigravity IDE

**Version**: v2.5.0  
**Created**: 2026-02-13  
**Status**: Planning

---

## 🎯 Objective

Mở rộng `agentools` để sync MCP (Model Context Protocol) servers, không chỉ skills và workflows. Ban đầu chỉ hỗ trợ Antigravity IDE.

### Current State
- ✅ Package hiện tại sync: **skills** và **workflows**
- ⏳ Cần thêm: **MCP servers**

### Target State
- ✅ Sync skills, workflows, và **MCP servers**
- ✅ Install MCP servers vào `~/.gemini/antigravity/mcp_config.json`
- ✅ Support GitHub repo structure với folder `mcp-servers/`

---

## 🧠 Background: What is MCP?

**Model Context Protocol (MCP)** là open standard của Anthropic để AI systems kết nối với:
- Local tools (file systems, databases)
- External services (APIs, GitHub)
- Real-time context (database schemas, live data)

**MCP Server** = một program expose capabilities qua MCP protocol.

**Antigravity Integration:**
- Antigravity dùng `mcp_config.json` để configure MCP servers
- Location: `~/.gemini/antigravity/mcp_config.json`
- Format: JSON với `mcpServers` object chứa server configs

---

## 🏗️ Design

### Repository Structure

```
my-ai-skills/                   # GitHub repo
├── .agents/
│   ├── skills/                 # Existing
│   ├── workflows/              # Existing
│   └── mcp-servers/            # ✨ NEW
│       ├── filesystem/
│       │   └── config.json     # MCP server definition
│       ├── github/
│       │   └── config.json
│       └── postgres/
│           └── config.json
├── .gitignore
└── README.md
```

### MCP Server Definition Format

Each MCP server folder contains a `config.json` with:

**Fields:**
- `name` - Server identifier (must match folder name)
- `description` - Human-readable description
- `command` - Executable to run the server
- `args` - Command-line arguments (array)
- `env` - Environment variables (object, can use `${VAR}` for secrets)
- `enabled` - Boolean, whether to install this server

**Note**: MCP servers install to **ALL detected platforms**. POC implementation handles Antigravity only, other platforms coming later.

### Local MCP Config Structure

```
~/.gemini/antigravity/
├── mcp_config.json             # ✨ Main MCP config
├── skills/
└── workflows/
```

Package sẽ generate/update `mcp_config.json` với các servers từ repo.

---

## 🔧 Implementation

### Phase 1: Platform Support

**Update `package/scripts/platforms.js`:**
- Add `mcpConfigFile` field cho Antigravity platform
- Add `mcpConfigPath` getter method

### Phase 2: MCP Discovery & Validation

**Create `package/scripts/mcp-manager.js`:**

Key functions:
- `getAvailableMcpServers()` - Scan `.agents/mcp-servers/`, parse configs
- `validateMcpConfig(config)` - Validate required fields (name, command, args type, etc.)
- `installMcpServers(platform, options)` - Install servers to `mcp_config.json`

Logic:
- Read all folders in `.agents/mcp-servers/`
- Parse `config.json` in each folder
- Validate structure
- Filter by `enabled` field only (no platform check)
- Merge vào existing `mcp_config.json` (or create new)
- Support `--force` flag để overwrite existing servers

**POC Implementation**: Only Antigravity platform supported initially

### Phase 3: Installer Integration

**Update `package/scripts/installer.js`:**
- Import `mcp-manager`
- Add `mcpServers` field to results object
- Call `installMcpServers()` for Antigravity platform only
- Handle errors gracefully

### Phase 4: CLI Commands

**Update `package/bin/cli.js`:**
- Update `listSkills()` to show MCP servers
- Update install output to include MCP servers stats (Added/Updated/Skipped)

---

## 📝 Usage Flow

1. User tạo MCP server configs trong `.agents/mcp-servers/` của repo
2. `agentools pull` để sync repo
3. `agentools install` để install skills, workflows, và MCP servers
4. Package copy configs vào `~/.gemini/antigravity/mcp_config.json`
5. Antigravity load MCP servers khi khởi động

---

## ✅ Testing Strategy

### Unit Tests

**`package/test/mcp-manager.test.js`:**
- Test `validateMcpConfig()` với valid/invalid configs
- Test missing required fields
- Test invalid data types (args not array, env not object)

**`package/test/installer.test.js`:**
- Test MCP installation cho Antigravity platform
- Verify `mcp_config.json` được tạo correctly
- Test merge logic với existing config
- Test `--force` flag behavior

### Integration Tests (Manual)

1. Setup test repo với sample MCP servers
2. Test installation flow: init → pull → install
3. Verify `mcp_config.json` xuất hiện đúng location
4. Open Antigravity → "Manage MCP Servers" → verify servers loaded
5. Test `enabled: false` behavior
6. Test environment variable preservation (`${VAR}`)
7. Test force update

---

## 📦 Deliverables

**New files:**
- `package/scripts/mcp-manager.js`
- `package/test/mcp-manager.test.js`

**Modified files:**
- `package/scripts/platforms.js`
- `package/scripts/installer.js`
- `package/bin/cli.js`
- `README.md`, `AGENT.md`
- `package/package.json` (bump to v2.5.0)

---

## 🎯 Success Criteria

1. ✅ MCP servers từ `.agents/mcp-servers/` được discover correctly
2. ✅ `agentools install` tạo/update `~/.gemini/antigravity/mcp_config.json`
3. ✅ Support `enabled: false` để skip servers
4. ✅ `agentools list` hiển thị available MCP servers
5. ✅ `--force` flag overwrites existing servers
6. ✅ Environment variables được preserve (e.g., `${GITHUB_TOKEN}`)
7. ✅ Backward compatible - không ảnh hưởng skills/workflows existing
8. ✅ Antigravity nhận diện và load MCP servers correctly
9. ✅ POC: Antigravity only, extensible cho platforms khác sau

---

## 🚀 Implementation Phases

### Phase 1: Foundation
- [ ] Create `mcp-manager.js` with discovery functions
- [ ] Add validation logic
- [ ] Update `platforms.js` with `mcpConfigPath`
- [ ] Unit tests for validation

### Phase 2: Installation Logic
- [ ] Implement `installMcpServers()` function
- [ ] Integrate with `installer.js`
- [ ] Handle merge logic for existing `mcp_config.json`
- [ ] Unit tests for installation

### Phase 3: CLI Integration
- [ ] Update `agentools list` command
- [ ] Update install output formatting
- [ ] Add MCP-specific help text

### Phase 4: Testing & Documentation
- [ ] Complete unit test suite
- [ ] Manual testing with real Antigravity
- [ ] Write comprehensive documentation
- [ ] Create example MCP server configs
- [ ] Update README and AGENT.md

### Phase 5: Release
- [ ] Bump version to v2.5.0
- [ ] Test npm package locally
- [ ] Publish to npm
- [ ] Create GitHub release notes

---

## 🔮 Future Enhancements (v2.6+)

- [ ] Support MCP servers for other platforms (Claude Code, Cursor)
- [ ] MCP server marketplace/discovery
- [ ] Auto-install npm packages required by MCP servers
- [ ] Validate MCP server health after installation
- [ ] Interactive MCP server configuration wizard
- [ ] Environment variable management UI/CLI
- [ ] MCP server templates/scaffolding

---

## 🤔 Open Questions

1. **Environment Variables:**
   - How to handle secrets like `${GITHUB_TOKEN}`?
   - Should we provide `.env` file support?
   - Or just document that users need to set them manually?

2. **Platform Expansion:**
   - Does Claude Code support MCP servers?
   - What's the config format for other platforms?

3. **Validation:**
   - Should we validate that MCP server packages exist on npm?
   - Should we test-run servers after installation?

4. **Conflicts:**
   - What if user manually edited `mcp_config.json`?
   - Merge strategy: override, merge, or prompt?

---

**Next Steps:**
1. ⏳ Review plan with team
2. ⏳ Resolve open questions
3. ⏳ Start Phase 1 implementation
4. ⏳ Create example MCP servers in test repo
5. ⏳ Test with real Antigravity installation
