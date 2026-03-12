# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.8.0] - 2026-02-15

### Added
- 🎉 **MCP support for Cursor** (`~/.cursor/mcp.json`)
- 🎉 **MCP support for Windsurf** (`~/.codeium/windsurf/mcp_config.json`)
- 🎉 **MCP support for Codex CLI** (`~/.codex/config.toml` - TOML format)
- TOML configuration format support for Codex CLI
- Platform-specific MCP field handling:
  - Cursor: JSON format (similar to Claude Code)
  - Windsurf: JSON format with `disabled` boolean field
  - Codex: TOML format with `enabled`, `disabled_tools` fields
- Multi-format config I/O system (JSON and TOML)
- Helper functions: `getConfigFormat()`, `readPlatformConfig()`, `writePlatformConfig()`, `buildServerConfig()`
- Comprehensive test suite for TOML support (29 new tests)

### Changed
- Expanded MCP-capable platforms from 2 to 5
- Enhanced `writeMcpToPlatformConfig()` with format-aware logic
- Refactored `writeMcpWithSecretsToPlatformConfig()` to support TOML
- Updated platform detection for Cursor, Windsurf, and Codex CLI
- Improved code modularity with extracted helper functions

### Technical Details
- **TOML Key**: Uses `mcp_servers` (underscore) instead of `mcp.servers` (dot)
- **JSON Key**: Uses `mcpServers` (camelCase) as before
- **Format Detection**: Automatic based on platform `mcpConfigFormat` field
- **Backward Compatible**: All existing platforms (Claude, Antigravity) work unchanged

### Dependencies
- Added `@iarna/toml` ^2.2.5 for TOML parsing and stringifying (latest stable, TOML 0.5 spec)

### Documentation
- Updated README with new platform matrix
- Added TOML config examples
- Documented platform-specific field differences

## [2.7.3] - 2026-02-14

### Fixed
- Architecture and platform detection bugs
- Security improvements for auto-config opt-out
- Synchronized versioning across components

## [2.7.2] - 2026-02-13

### Security
- Added opt-out mechanism for auto-configuration
- Prevented password leakage in MCP config files
- Secured MCP config files with proper permissions (0o600)

## [2.7.1] - 2026-02-13

### Security
- Enhanced secret protection mechanisms
- Improved file permission handling

## [2.7.0] - 2026-02-14

### Added
- MCP server installation to Claude Code
- Multi-platform MCP config writer
- Cross-platform MCP config path detection (macOS/Windows/Linux)
- Preservation of existing config keys (e.g., Claude's `preferences`)

### Changed
- MCP-capable platforms expanded to include Claude Code
- Enhanced platform-specific field handling for `disabledTools`

## [2.6.0] - 2026-02-13

### Added
- Bitwarden integration for MCP secret management
- `agentools secrets sync` command
- Automatic secret resolution from Bitwarden vault
- MCP server configuration with `bitwardenEnv` field

### Changed
- MCP servers scanned from repo `.agents/mcp-servers/` instead of platform files
- Platform-agnostic MCP installation flow

## Earlier Versions

See git history for changes prior to v2.6.0.

---

**Legend:**
- 🎉 Major feature
- ✨ Enhancement
- 🐛 Bug fix
- 🔒 Security fix
- 📝 Documentation
- ⚡ Performance improvement
