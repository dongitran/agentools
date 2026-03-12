const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const toml = require("@iarna/toml");
const { setupTestHome, freshRequire } = require("./helpers");

describe("MCP TOML Support", () => {
  let env, mcpInstaller, platforms;

  before(() => {
    env = setupTestHome();
    platforms = freshRequire("../scripts/platforms");
    mcpInstaller = freshRequire("../scripts/mcp-installer", ["../scripts/platforms", "../scripts/config-manager"]);
  });

  after(() => { env.cleanup(); });

  describe("getConfigFormat", () => {
    it("should return json for Claude", () => {
      const format = mcpInstaller.getConfigFormat("claude");
      assert.strictEqual(format, "json");
    });

    it("should return json for Antigravity", () => {
      const format = mcpInstaller.getConfigFormat("antigravity");
      assert.strictEqual(format, "json");
    });

    it("should return json for Cursor", () => {
      const format = mcpInstaller.getConfigFormat("cursor");
      assert.strictEqual(format, "json");
    });

    it("should return json for Windsurf", () => {
      const format = mcpInstaller.getConfigFormat("windsurf");
      assert.strictEqual(format, "json");
    });

    it("should return toml for Codex CLI", () => {
      const format = mcpInstaller.getConfigFormat("codex");
      assert.strictEqual(format, "toml");
    });

    it("should default to json for unknown platform", () => {
      const format = mcpInstaller.getConfigFormat("unknown");
      assert.strictEqual(format, "json");
    });
  });

  describe("readPlatformConfig", () => {
    it("should read JSON config", () => {
      const tmpFile = path.join(env.tmpDir, "test.json");
      fs.writeFileSync(tmpFile, JSON.stringify({ mcpServers: { test: { command: "cmd" } } }));

      const config = mcpInstaller.readPlatformConfig(tmpFile, "json");
      assert.ok(config.mcpServers);
      assert.strictEqual(config.mcpServers.test.command, "cmd");
    });

    it("should read TOML config", () => {
      const tmpFile = path.join(env.tmpDir, "test.toml");
      const tomlContent = toml.stringify({
        mcp_servers: {
          test: { command: "cmd", args: ["arg1"] }
        }
      });
      fs.writeFileSync(tmpFile, tomlContent);

      const config = mcpInstaller.readPlatformConfig(tmpFile, "toml");
      assert.ok(config.mcp_servers);
      assert.strictEqual(config.mcp_servers.test.command, "cmd");
    });

    it("should return empty object for non-existent file", () => {
      const config = mcpInstaller.readPlatformConfig("/nonexistent/file.json", "json");
      assert.deepStrictEqual(config, {});
    });

    it("should handle malformed JSON gracefully", () => {
      const tmpFile = path.join(env.tmpDir, "bad.json");
      fs.writeFileSync(tmpFile, "not json");

      const config = mcpInstaller.readPlatformConfig(tmpFile, "json");
      assert.deepStrictEqual(config, {});
    });

    it("should handle malformed TOML gracefully", () => {
      const tmpFile = path.join(env.tmpDir, "bad.toml");
      fs.writeFileSync(tmpFile, "[invalid toml\nno closing bracket");

      const config = mcpInstaller.readPlatformConfig(tmpFile, "toml");
      assert.deepStrictEqual(config, {});
    });
  });

  describe("writePlatformConfig", () => {
    it("should write JSON config", () => {
      const tmpFile = path.join(env.tmpDir, "write-test.json");
      const config = { mcpServers: { srv1: { command: "test" } } };

      mcpInstaller.writePlatformConfig(tmpFile, config, "json");

      assert.ok(fs.existsSync(tmpFile));
      const written = JSON.parse(fs.readFileSync(tmpFile, "utf-8"));
      assert.strictEqual(written.mcpServers.srv1.command, "test");
    });

    it("should write TOML config", () => {
      const tmpFile = path.join(env.tmpDir, "write-test.toml");
      const config = {
        mcp_servers: {
          srv1: { command: "test", args: ["a1"] }
        }
      };

      mcpInstaller.writePlatformConfig(tmpFile, config, "toml");

      assert.ok(fs.existsSync(tmpFile));
      const content = fs.readFileSync(tmpFile, "utf-8");
      const parsed = toml.parse(content);
      assert.strictEqual(parsed.mcp_servers.srv1.command, "test");
    });

    it("should create parent directories if needed", () => {
      const tmpFile = path.join(env.tmpDir, "nested", "dir", "config.json");
      const config = { mcpServers: {} };

      mcpInstaller.writePlatformConfig(tmpFile, config, "json");

      assert.ok(fs.existsSync(tmpFile));
    });

    it("should set file permissions to 0o600 on Unix", () => {
      if (process.platform === "win32") {
        // Skip on Windows
        return;
      }

      const tmpFile = path.join(env.tmpDir, "perms.json");
      mcpInstaller.writePlatformConfig(tmpFile, {}, "json");

      const stats = fs.statSync(tmpFile);
      const mode = stats.mode & 0o777;
      assert.strictEqual(mode, 0o600);
    });
  });

  describe("buildServerConfig", () => {
    it("should build basic config for all platforms", () => {
      const server = { name: "test", command: "cmd", args: ["a1", "a2"] };

      const config = mcpInstaller.buildServerConfig(server, "claude");
      assert.strictEqual(config.command, "cmd");
      assert.deepStrictEqual(config.args, ["a1", "a2"]);
    });

    it("should preserve existing env vars", () => {
      const server = { command: "cmd", args: [] };
      const existing = { env: { OLD_VAR: "old" } };

      const config = mcpInstaller.buildServerConfig(server, "claude", existing);
      assert.strictEqual(config.env.OLD_VAR, "old");
    });

    it("should include disabledTools for Antigravity", () => {
      const server = {
        command: "cmd",
        args: [],
        disabledTools: ["tool1", "tool2"]
      };

      const config = mcpInstaller.buildServerConfig(server, "antigravity");
      assert.deepStrictEqual(config.disabledTools, ["tool1", "tool2"]);
    });

    it("should preserve existing disabledTools for Antigravity", () => {
      const server = { command: "cmd", args: [] };
      const existing = { disabledTools: ["existing"] };

      const config = mcpInstaller.buildServerConfig(server, "antigravity", existing);
      assert.deepStrictEqual(config.disabledTools, ["existing"]);
    });

    it("should preserve existing disabled field for Windsurf", () => {
      const server = { command: "cmd", args: [], enabled: true };
      const existing = { disabled: true };  // User manually disabled it

      const config = mcpInstaller.buildServerConfig(server, "windsurf", existing);
      assert.strictEqual(config.disabled, true);  // Should keep user's setting
    });

    it("should preserve existing enabled field for Codex", () => {
      const server = { command: "cmd", args: [], enabled: true };
      const existing = { enabled: false };  // User manually disabled it

      const config = mcpInstaller.buildServerConfig(server, "codex", existing);
      assert.strictEqual(config.enabled, false);  // Should keep user's setting
    });

    it("should preserve existing disabled_tools for Codex", () => {
      const server = { command: "cmd", args: [], disabledTools: ["tool1", "tool2"] };
      const existing = { disabled_tools: ["customTool"] };  // User's custom list

      const config = mcpInstaller.buildServerConfig(server, "codex", existing);
      assert.deepStrictEqual(config.disabled_tools, ["customTool"]);  // Keep user's list
    });

    it("should NOT include disabledTools for Claude", () => {
      const server = {
        command: "cmd",
        args: [],
        disabledTools: ["tool1"]
      };

      const config = mcpInstaller.buildServerConfig(server, "claude");
      assert.strictEqual(config.disabledTools, undefined);
    });

    it("should NOT include disabledTools for Cursor", () => {
      const server = {
        command: "cmd",
        args: [],
        disabledTools: ["tool1"]
      };

      const config = mcpInstaller.buildServerConfig(server, "cursor");
      assert.strictEqual(config.disabledTools, undefined);
    });

    it("should convert enabled to disabled for Windsurf", () => {
      const server = {
        command: "cmd",
        args: [],
        enabled: false
      };

      const config = mcpInstaller.buildServerConfig(server, "windsurf");
      assert.strictEqual(config.disabled, true);
    });

    it("should include enabled and disabled_tools for Codex", () => {
      const server = {
        command: "cmd",
        args: [],
        enabled: true,
        disabledTools: ["tool1", "tool2"]
      };

      const config = mcpInstaller.buildServerConfig(server, "codex");
      assert.strictEqual(config.enabled, true);
      assert.deepStrictEqual(config.disabled_tools, ["tool1", "tool2"]);
    });
  });

  describe("TOML MCP Key Constants", () => {
    it("should use mcp_servers for TOML", () => {
      // This is a critical test - verifies we use underscore not dot
      const config = { mcp_servers: { test: { command: "cmd" } } };
      const tmpFile = path.join(env.tmpDir, "key-test.toml");

      mcpInstaller.writePlatformConfig(tmpFile, config, "toml");

      const content = fs.readFileSync(tmpFile, "utf-8");
      assert.ok(content.includes("[mcp_servers.test]"));
      assert.ok(!content.includes("[mcp.servers.test]")); // Should NOT have dot
    });

    it("should use mcpServers for JSON", () => {
      const config = { mcpServers: { test: { command: "cmd" } } };
      const tmpFile = path.join(env.tmpDir, "key-test.json");

      mcpInstaller.writePlatformConfig(tmpFile, config, "json");

      const written = JSON.parse(fs.readFileSync(tmpFile, "utf-8"));
      assert.ok(written.mcpServers);
      assert.strictEqual(written.mcp_servers, undefined);
    });
  });

  describe("Platform-specific integration", () => {
    let configManager;

    beforeEach(() => {
      configManager = freshRequire("../scripts/config-manager", ["../scripts/platforms"]);
      const configDir = configManager.getConfigDir();
      if (fs.existsSync(configDir)) fs.rmSync(configDir, { recursive: true, force: true });
      configManager.initConfig();
    });

    function setupMcpServer(name, config) {
      const repoLocal = configManager.loadConfig().repository.local;
      const expanded = repoLocal.replace(/^~/, env.tmpDir);
      const mcpDir = path.join(expanded, ".agents", "mcp-servers", name);
      fs.mkdirSync(mcpDir, { recursive: true });
      fs.writeFileSync(path.join(mcpDir, "config.json"), JSON.stringify(config), "utf-8");
    }

    it("should install to Cursor with JSON format", () => {
      const cursor = platforms.getByName("cursor");
      fs.mkdirSync(path.dirname(cursor.mcpConfigPath), { recursive: true });

      setupMcpServer("cursor-test", {
        name: "cursor-test",
        command: "npx",
        args: ["-y", "pkg"]
      });

      const r = mcpInstaller.installMcpServers({ force: true, platform: cursor });
      assert.ok(r.added > 0);

      const config = JSON.parse(fs.readFileSync(cursor.mcpConfigPath, "utf-8"));
      assert.ok(config.mcpServers["cursor-test"]);
      assert.strictEqual(config.mcpServers["cursor-test"].command, "npx");
    });

    it("should install to Windsurf with JSON format", () => {
      const windsurf = platforms.getByName("windsurf");
      fs.mkdirSync(path.dirname(windsurf.mcpConfigPath), { recursive: true });

      setupMcpServer("windsurf-test", {
        name: "windsurf-test",
        command: "npx",
        args: ["-y", "pkg"]
      });

      const r = mcpInstaller.installMcpServers({ force: true, platform: windsurf });
      assert.ok(r.added > 0);

      const config = JSON.parse(fs.readFileSync(windsurf.mcpConfigPath, "utf-8"));
      assert.ok(config.mcpServers["windsurf-test"]);
    });

    it("should install to Codex with TOML format", () => {
      const codex = platforms.getByName("codex");
      fs.mkdirSync(path.dirname(codex.mcpConfigPath), { recursive: true });

      setupMcpServer("codex-test", {
        name: "codex-test",
        command: "npx",
        args: ["-y", "pkg"],
        enabled: true,
        disabledTools: ["tool1"]
      });

      const r = mcpInstaller.installMcpServers({ force: true, platform: codex });
      assert.ok(r.added > 0);

      const content = fs.readFileSync(codex.mcpConfigPath, "utf-8");
      const config = toml.parse(content);

      assert.ok(config.mcp_servers);
      assert.ok(config.mcp_servers["codex-test"]);
      assert.strictEqual(config.mcp_servers["codex-test"].command, "npx");
      assert.strictEqual(config.mcp_servers["codex-test"].enabled, true);
      assert.deepStrictEqual(config.mcp_servers["codex-test"].disabled_tools, ["tool1"]);
    });

    it("should preserve existing TOML config sections for Codex", () => {
      const codex = platforms.getByName("codex");
      fs.mkdirSync(path.dirname(codex.mcpConfigPath), { recursive: true });

      // Create existing config with other sections
      const existingConfig = {
        sandbox: { mode: "read-only" },
        model: { provider: "openai" },
        mcp_servers: {
          existing: { command: "old", args: [] }
        }
      };
      fs.writeFileSync(codex.mcpConfigPath, toml.stringify(existingConfig));

      setupMcpServer("new-server", {
        name: "new-server",
        command: "new",
        args: []
      });

      mcpInstaller.installMcpServers({ force: true, platform: codex });

      const content = fs.readFileSync(codex.mcpConfigPath, "utf-8");
      const config = toml.parse(content);

      // Should preserve existing sections
      assert.ok(config.sandbox);
      assert.strictEqual(config.sandbox.mode, "read-only");
      assert.ok(config.model);

      // Should have both servers
      assert.ok(config.mcp_servers.existing);
      assert.ok(config.mcp_servers["new-server"]);
    });
  });
});
