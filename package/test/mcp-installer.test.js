const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const { setupTestHome, freshRequire, createTempDir, cleanTempDir } = require("./helpers");

describe("MCP Installer Module", () => {
  let env, mcpInstaller, configManager;

  before(() => {
    env = setupTestHome();
    configManager = freshRequire("../scripts/config-manager", ["../scripts/platforms"]);
    mcpInstaller = freshRequire("../scripts/mcp-installer", ["../scripts/platforms", "../scripts/config-manager"]);
  });

  after(() => { env.cleanup(); });

  beforeEach(() => {
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
    return mcpDir;
  }

  describe("SKIP_FOLDERS", () => {
    it("should include bitwarden", () => {
      assert.ok(mcpInstaller.SKIP_FOLDERS.includes("bitwarden"));
    });
  });

  describe("validateMcpConfig", () => {
    it("should validate a valid config", () => {
      const r = mcpInstaller.validateMcpConfig({
        name: "test", command: "npx", args: ["-y", "pkg"],
      });
      assert.strictEqual(r.valid, true);
      assert.strictEqual(r.errors.length, 0);
    });

    it("should reject missing name", () => {
      const r = mcpInstaller.validateMcpConfig({ command: "npx", args: [] });
      assert.ok(!r.valid);
      assert.ok(r.errors.some(e => e.includes("name")));
    });

    it("should reject missing command", () => {
      const r = mcpInstaller.validateMcpConfig({ name: "x", args: [] });
      assert.ok(!r.valid);
      assert.ok(r.errors.some(e => e.includes("command")));
    });

    it("should reject invalid args", () => {
      const r = mcpInstaller.validateMcpConfig({ name: "x", command: "y", args: "not-array" });
      assert.ok(!r.valid);
      assert.ok(r.errors.some(e => e.includes("args")));
    });

    it("should reject invalid bitwardenEnv", () => {
      const r = mcpInstaller.validateMcpConfig({ name: "x", command: "y", args: [], bitwardenEnv: "str" });
      assert.ok(!r.valid);
      assert.ok(r.errors.some(e => e.includes("bitwardenEnv")));
    });

    it("should reject invalid disabledTools", () => {
      const r = mcpInstaller.validateMcpConfig({ name: "x", command: "y", args: [], disabledTools: "str" });
      assert.ok(!r.valid);
      assert.ok(r.errors.some(e => e.includes("disabledTools")));
    });

    it("should accept optional bitwardenEnv object", () => {
      const r = mcpInstaller.validateMcpConfig({
        name: "x", command: "y", args: [],
        bitwardenEnv: { KEY: "item" }, disabledTools: ["tool1"],
      });
      assert.strictEqual(r.valid, true);
    });
  });

  describe("getMcpServersDir", () => {
    it("should return null when no repo local", () => {
      configManager.setConfigValue("repository.local", null);
      assert.strictEqual(mcpInstaller.getMcpServersDir(), null);
    });

    it("should return null when dir does not exist", () => {
      assert.strictEqual(mcpInstaller.getMcpServersDir(), null);
    });

    it("should return path when mcp-servers exists", () => {
      const repoLocal = configManager.loadConfig().repository.local;
      const expanded = repoLocal.replace(/^~/, env.tmpDir);
      fs.mkdirSync(path.join(expanded, ".agents", "mcp-servers"), { recursive: true });
      const result = mcpInstaller.getMcpServersDir();
      assert.ok(result);
      assert.ok(result.includes("mcp-servers"));
    });
  });

  describe("getAvailableMcpServers", () => {
    it("should return empty when no mcp dir", () => {
      assert.deepStrictEqual(mcpInstaller.getAvailableMcpServers(), []);
    });

    it("should return valid server configs", () => {
      setupMcpServer("test-server", { name: "test-server", command: "npx", args: ["-y", "pkg"] });
      const servers = mcpInstaller.getAvailableMcpServers();
      assert.strictEqual(servers.length, 1);
      assert.strictEqual(servers[0].name, "test-server");
    });

    it("should skip folders in SKIP_FOLDERS", () => {
      setupMcpServer("bitwarden", { name: "bw", command: "npx", args: [] });
      setupMcpServer("valid", { name: "valid", command: "cmd", args: [] });
      const servers = mcpInstaller.getAvailableMcpServers();
      assert.ok(!servers.some(s => s.name === "bw"));
      assert.ok(servers.some(s => s.name === "valid"));
    });

    it("should skip invalid configs", () => {
      setupMcpServer("invalid", { name: "invalid" }); // missing command, args
      const servers = mcpInstaller.getAvailableMcpServers();
      assert.ok(!servers.some(s => s.name === "invalid"));
    });

    it("should skip non-directory entries", () => {
      const repoLocal = configManager.loadConfig().repository.local;
      const expanded = repoLocal.replace(/^~/, env.tmpDir);
      const mcpDir = path.join(expanded, ".agents", "mcp-servers");
      fs.mkdirSync(mcpDir, { recursive: true });
      fs.writeFileSync(path.join(mcpDir, "README.md"), "# Info");
      assert.deepStrictEqual(mcpInstaller.getAvailableMcpServers(), []);
    });

    it("should skip dirs without config.json", () => {
      const repoLocal = configManager.loadConfig().repository.local;
      const expanded = repoLocal.replace(/^~/, env.tmpDir);
      const mcpDir = path.join(expanded, ".agents", "mcp-servers", "no-config");
      fs.mkdirSync(mcpDir, { recursive: true });
      assert.deepStrictEqual(mcpInstaller.getAvailableMcpServers(), []);
    });

    it("should handle malformed JSON gracefully", () => {
      const repoLocal = configManager.loadConfig().repository.local;
      const expanded = repoLocal.replace(/^~/, env.tmpDir);
      const mcpDir = path.join(expanded, ".agents", "mcp-servers", "bad-json");
      fs.mkdirSync(mcpDir, { recursive: true });
      fs.writeFileSync(path.join(mcpDir, "config.json"), "not json", "utf-8");
      assert.deepStrictEqual(mcpInstaller.getAvailableMcpServers(), []);
    });
  });

  describe("collectBitwardenEnvs", () => {
    it("should collect env mappings", () => {
      setupMcpServer("s1", {
        name: "s1", command: "cmd", args: [],
        bitwardenEnv: { API_KEY: "bw-api-key" },
      });
      const envs = mcpInstaller.collectBitwardenEnvs();
      assert.ok(envs.length > 0);
      assert.strictEqual(envs[0].serverName, "s1");
      assert.strictEqual(envs[0].envVar, "API_KEY");
    });

    it("should skip disabled servers", () => {
      setupMcpServer("disabled", {
        name: "disabled", command: "cmd", args: [],
        enabled: false, bitwardenEnv: { KEY: "val" },
      });
      const envs = mcpInstaller.collectBitwardenEnvs();
      assert.ok(!envs.some(e => e.serverName === "disabled"));
    });

    it("should skip servers without bitwardenEnv", () => {
      setupMcpServer("nobw", { name: "nobw", command: "cmd", args: [] });
      const envs = mcpInstaller.collectBitwardenEnvs();
      assert.ok(!envs.some(e => e.serverName === "nobw"));
    });
  });

  describe("installMcpServers", () => {
    it("should return zeros when no antigravity", () => {
      // In test HOME, antigravity is not detected
      const r = mcpInstaller.installMcpServers();
      assert.strictEqual(r.added, 0);
    });

    it("should install servers to antigravity config", () => {
      // Create antigravity config dir
      const platforms = require("../scripts/platforms");
      const ag = platforms.getByName("antigravity");
      fs.mkdirSync(path.dirname(ag.mcpConfigPath), { recursive: true });

      setupMcpServer("my-mcp", { name: "my-mcp", command: "npx", args: ["-y", "pkg"] });
      const r = mcpInstaller.installMcpServers({ force: true });
      assert.ok(r.added > 0);
      assert.ok(r.servers.includes("my-mcp"));

      const config = JSON.parse(fs.readFileSync(ag.mcpConfigPath, "utf-8"));
      assert.ok(config.mcpServers["my-mcp"]);
    });

    it("should skip existing servers without force", () => {
      const platforms = require("../scripts/platforms");
      const ag = platforms.getByName("antigravity");
      fs.mkdirSync(path.dirname(ag.mcpConfigPath), { recursive: true });
      fs.writeFileSync(ag.mcpConfigPath, JSON.stringify({
        mcpServers: { "my-mcp": { command: "old", args: [] } },
      }), "utf-8");

      setupMcpServer("my-mcp", { name: "my-mcp", command: "new", args: [] });
      // Pass platform explicitly to test only antigravity
      const r = mcpInstaller.installMcpServers({ force: false, platform: ag });
      assert.strictEqual(r.skipped, 1);
    });

    it("should handle corrupt mcp_config.json", () => {
      const platforms = require("../scripts/platforms");
      const ag = platforms.getByName("antigravity");
      fs.mkdirSync(path.dirname(ag.mcpConfigPath), { recursive: true });
      fs.writeFileSync(ag.mcpConfigPath, "not json", "utf-8");

      setupMcpServer("s2", { name: "s2", command: "cmd", args: [] });
      const r = mcpInstaller.installMcpServers({ force: true });
      assert.ok(r.added > 0);
    });

    it("should preserve existing env when not forcing", () => {
      const platforms = require("../scripts/platforms");
      const ag = platforms.getByName("antigravity");
      fs.mkdirSync(path.dirname(ag.mcpConfigPath), { recursive: true });
      fs.writeFileSync(ag.mcpConfigPath, JSON.stringify({
        mcpServers: { "s3": { command: "old", args: [], env: { SECRET: "keep" } } },
      }), "utf-8");

      setupMcpServer("s3", { name: "s3", command: "new", args: [] });
      const r = mcpInstaller.installMcpServers({ force: true });
      const config = JSON.parse(fs.readFileSync(ag.mcpConfigPath, "utf-8"));
      assert.strictEqual(config.mcpServers.s3.env.SECRET, "keep");
    });

    it("should include disabledTools", () => {
      const platforms = require("../scripts/platforms");
      const ag = platforms.getByName("antigravity");
      fs.mkdirSync(path.dirname(ag.mcpConfigPath), { recursive: true });

      setupMcpServer("dt", {
        name: "dt", command: "cmd", args: [],
        disabledTools: ["tool1", "tool2"],
      });
      mcpInstaller.installMcpServers({ force: true });
      const config = JSON.parse(fs.readFileSync(ag.mcpConfigPath, "utf-8"));
      assert.deepStrictEqual(config.mcpServers.dt.disabledTools, ["tool1", "tool2"]);
    });
  });

  describe("writeMcpToPlatformConfig", () => {
    it("should preserve non-mcpServers keys", () => {
      const tmpFile = path.join(env.tmpDir, "test-preserve.json");
      fs.writeFileSync(tmpFile, JSON.stringify({
        preferences: { theme: "dark" },
        mcpServers: {},
      }), "utf-8");

      const servers = [{ name: "s1", command: "cmd", args: ["-y"] }];
      mcpInstaller.writeMcpToPlatformConfig(tmpFile, servers, { force: true, platformName: "claude" });

      const config = JSON.parse(fs.readFileSync(tmpFile, "utf-8"));
      assert.deepStrictEqual(config.preferences, { theme: "dark" });
      assert.ok(config.mcpServers.s1);
    });

    it("should create directory if not exists", () => {
      const tmpFile = path.join(env.tmpDir, "new-dir", "sub", "config.json");
      const servers = [{ name: "s1", command: "cmd", args: [] }];
      mcpInstaller.writeMcpToPlatformConfig(tmpFile, servers, { force: true, platformName: "test" });

      assert.ok(fs.existsSync(tmpFile));
      const config = JSON.parse(fs.readFileSync(tmpFile, "utf-8"));
      assert.ok(config.mcpServers.s1);
    });

    it("should merge new servers with existing", () => {
      const tmpFile = path.join(env.tmpDir, "test-merge.json");
      fs.writeFileSync(tmpFile, JSON.stringify({
        mcpServers: { existing: { command: "old", args: [] } },
      }), "utf-8");

      const servers = [{ name: "new-srv", command: "cmd", args: ["-y"] }];
      mcpInstaller.writeMcpToPlatformConfig(tmpFile, servers, { force: false, platformName: "test" });

      const config = JSON.parse(fs.readFileSync(tmpFile, "utf-8"));
      assert.ok(config.mcpServers.existing);
      assert.ok(config.mcpServers["new-srv"]);
    });

    it("should not include disabledTools for Claude platform", () => {
      const tmpFile = path.join(env.tmpDir, "test-claude-dt.json");
      const servers = [{ name: "s1", command: "cmd", args: [], disabledTools: ["tool1", "tool2"] }];
      mcpInstaller.writeMcpToPlatformConfig(tmpFile, servers, { force: true, platformName: "claude" });

      const config = JSON.parse(fs.readFileSync(tmpFile, "utf-8"));
      assert.strictEqual(config.mcpServers.s1.disabledTools, undefined);
    });

    it("should include disabledTools for non-Claude platforms", () => {
      const tmpFile = path.join(env.tmpDir, "test-ag-dt.json");
      const servers = [{ name: "s1", command: "cmd", args: [], disabledTools: ["tool1"] }];
      mcpInstaller.writeMcpToPlatformConfig(tmpFile, servers, { force: true, platformName: "antigravity" });

      const config = JSON.parse(fs.readFileSync(tmpFile, "utf-8"));
      assert.deepStrictEqual(config.mcpServers.s1.disabledTools, ["tool1"]);
    });
  });

  describe("installMcpServers - Claude Code", () => {
    it("should install to Claude config when detected", () => {
      const pf = require("../scripts/platforms");
      const claude = pf.getByName("claude");
      fs.mkdirSync(claude.configPath, { recursive: true });

      const claudeConfigDir = path.dirname(claude.mcpConfigPath);
      fs.mkdirSync(claudeConfigDir, { recursive: true });

      setupMcpServer("claude-mcp", { name: "claude-mcp", command: "npx", args: ["-y", "pkg"] });
      const r = mcpInstaller.installMcpServers({ force: true, platform: claude });
      assert.ok(r.added > 0);
      assert.ok(r.servers.includes("claude-mcp"));

      const config = JSON.parse(fs.readFileSync(claude.mcpConfigPath, "utf-8"));
      assert.ok(config.mcpServers["claude-mcp"]);
      assert.strictEqual(config.mcpServers["claude-mcp"].command, "npx");
    });

    it("should NOT include disabledTools for Claude", () => {
      const pf = require("../scripts/platforms");
      const claude = pf.getByName("claude");
      fs.mkdirSync(claude.configPath, { recursive: true });
      const claudeConfigDir = path.dirname(claude.mcpConfigPath);
      fs.mkdirSync(claudeConfigDir, { recursive: true });

      setupMcpServer("dt-claude", {
        name: "dt-claude", command: "cmd", args: [],
        disabledTools: ["tool1", "tool2"],
      });
      mcpInstaller.installMcpServers({ force: true, platform: claude });
      const config = JSON.parse(fs.readFileSync(claude.mcpConfigPath, "utf-8"));
      assert.strictEqual(config.mcpServers["dt-claude"].disabledTools, undefined);
    });

    it("should preserve existing preferences in Claude config", () => {
      const pf = require("../scripts/platforms");
      const claude = pf.getByName("claude");
      fs.mkdirSync(claude.configPath, { recursive: true });
      const claudeConfigDir = path.dirname(claude.mcpConfigPath);
      fs.mkdirSync(claudeConfigDir, { recursive: true });

      // Pre-write config with preferences
      fs.writeFileSync(claude.mcpConfigPath, JSON.stringify({
        preferences: { theme: "dark", fontSize: 14 },
        mcpServers: {},
      }), "utf-8");

      setupMcpServer("pref-test", { name: "pref-test", command: "cmd", args: [] });
      mcpInstaller.installMcpServers({ force: true, platform: claude });

      const config = JSON.parse(fs.readFileSync(claude.mcpConfigPath, "utf-8"));
      assert.deepStrictEqual(config.preferences, { theme: "dark", fontSize: 14 });
      assert.ok(config.mcpServers["pref-test"]);
    });

    it("should create config file if not exists", () => {
      const pf = require("../scripts/platforms");
      const claude = pf.getByName("claude");
      fs.mkdirSync(claude.configPath, { recursive: true });
      // Don't create the config file - let installMcpServers create it

      setupMcpServer("new-file", { name: "new-file", command: "cmd", args: [] });
      mcpInstaller.installMcpServers({ force: true, platform: claude });

      assert.ok(fs.existsSync(claude.mcpConfigPath));
      const config = JSON.parse(fs.readFileSync(claude.mcpConfigPath, "utf-8"));
      assert.ok(config.mcpServers["new-file"]);
    });

    it("should handle corrupt Claude config gracefully", () => {
      const pf = require("../scripts/platforms");
      const claude = pf.getByName("claude");
      fs.mkdirSync(claude.configPath, { recursive: true });
      const claudeConfigDir = path.dirname(claude.mcpConfigPath);
      fs.mkdirSync(claudeConfigDir, { recursive: true });

      fs.writeFileSync(claude.mcpConfigPath, "not json", "utf-8");

      setupMcpServer("corrupt-test", { name: "corrupt-test", command: "cmd", args: [] });
      const r = mcpInstaller.installMcpServers({ force: true, platform: claude });
      assert.ok(r.added > 0);
    });

    it("should skip existing servers without force", () => {
      const pf = require("../scripts/platforms");
      const claude = pf.getByName("claude");
      fs.mkdirSync(claude.configPath, { recursive: true });
      const claudeConfigDir = path.dirname(claude.mcpConfigPath);
      fs.mkdirSync(claudeConfigDir, { recursive: true });

      fs.writeFileSync(claude.mcpConfigPath, JSON.stringify({
        mcpServers: { "skip-me": { command: "old", args: [] } },
      }), "utf-8");

      setupMcpServer("skip-me", { name: "skip-me", command: "new", args: [] });
      const r = mcpInstaller.installMcpServers({ force: false, platform: claude });
      assert.strictEqual(r.skipped, 1);
    });
  });

  describe("installMcpServersWithSecrets", () => {
    it("should return zeros when no MCP-capable platforms detected", () => {
      const r = mcpInstaller.installMcpServersWithSecrets({});
      assert.strictEqual(r.installed, 0);
    });

    it("should resolve secrets into env", () => {
      const platforms = require("../scripts/platforms");
      const ag = platforms.getByName("antigravity");
      fs.mkdirSync(path.dirname(ag.mcpConfigPath), { recursive: true });

      setupMcpServer("sec-srv", {
        name: "sec-srv", command: "cmd", args: [],
        bitwardenEnv: { API_KEY: "my-api-key-item" },
      });

      const r = mcpInstaller.installMcpServersWithSecrets({ "my-api-key-item": "secret123" });
      assert.ok(r.installed > 0);
      const config = JSON.parse(fs.readFileSync(ag.mcpConfigPath, "utf-8"));
      assert.strictEqual(config.mcpServers["sec-srv"].env.API_KEY, "secret123");
    });

    it("should preserve existing disabledTools", () => {
      const platforms = require("../scripts/platforms");
      const ag = platforms.getByName("antigravity");
      fs.mkdirSync(path.dirname(ag.mcpConfigPath), { recursive: true });
      fs.writeFileSync(ag.mcpConfigPath, JSON.stringify({
        mcpServers: { "s4": { command: "old", args: [], disabledTools: ["custom"] } },
      }), "utf-8");

      setupMcpServer("s4", { name: "s4", command: "new", args: [] });
      mcpInstaller.installMcpServersWithSecrets({});
      const config = JSON.parse(fs.readFileSync(ag.mcpConfigPath, "utf-8"));
      assert.deepStrictEqual(config.mcpServers.s4.disabledTools, ["custom"]);
    });

    it("should handle servers without bitwardenEnv", () => {
      const platforms = require("../scripts/platforms");
      const ag = platforms.getByName("antigravity");
      fs.mkdirSync(path.dirname(ag.mcpConfigPath), { recursive: true });

      setupMcpServer("nobw", { name: "nobw", command: "cmd", args: [] });
      const r = mcpInstaller.installMcpServersWithSecrets({});
      assert.ok(r.servers.some(s => s.name === "nobw" && s.secretsCount === 0));
    });

    it("should handle corrupt mcp_config.json", () => {
      const platforms = require("../scripts/platforms");
      const ag = platforms.getByName("antigravity");
      fs.mkdirSync(path.dirname(ag.mcpConfigPath), { recursive: true });
      fs.writeFileSync(ag.mcpConfigPath, "bad json", "utf-8");

      setupMcpServer("s5", { name: "s5", command: "cmd", args: [] });
      const r = mcpInstaller.installMcpServersWithSecrets({});
      assert.ok(r.installed > 0);
    });

    it("should use server disabledTools when no existing ones", () => {
      const platforms = require("../scripts/platforms");
      const ag = platforms.getByName("antigravity");
      fs.mkdirSync(path.dirname(ag.mcpConfigPath), { recursive: true });

      setupMcpServer("s6", {
        name: "s6", command: "cmd", args: [],
        disabledTools: ["from-config"],
      });
      mcpInstaller.installMcpServersWithSecrets({});
      const config = JSON.parse(fs.readFileSync(ag.mcpConfigPath, "utf-8"));
      assert.deepStrictEqual(config.mcpServers.s6.disabledTools, ["from-config"]);
    });
  });

  describe("installMcpServersWithSecrets - Claude Code", () => {
    it("should write resolved env to Claude config", () => {
      const pf = require("../scripts/platforms");
      const claude = pf.getByName("claude");
      fs.mkdirSync(claude.configPath, { recursive: true });
      const claudeConfigDir = path.dirname(claude.mcpConfigPath);
      fs.mkdirSync(claudeConfigDir, { recursive: true });

      setupMcpServer("sec-claude", {
        name: "sec-claude", command: "cmd", args: [],
        bitwardenEnv: { API_KEY: "claude-api-key-item" },
      });

      const r = mcpInstaller.installMcpServersWithSecrets({ "claude-api-key-item": "secret-val" });
      assert.ok(r.installed > 0);
      const config = JSON.parse(fs.readFileSync(claude.mcpConfigPath, "utf-8"));
      assert.strictEqual(config.mcpServers["sec-claude"].env.API_KEY, "secret-val");
    });

    it("should NOT include disabledTools for Claude in secrets sync", () => {
      const pf = require("../scripts/platforms");
      const claude = pf.getByName("claude");
      fs.mkdirSync(claude.configPath, { recursive: true });
      const claudeConfigDir = path.dirname(claude.mcpConfigPath);
      fs.mkdirSync(claudeConfigDir, { recursive: true });

      setupMcpServer("dt-sec-claude", {
        name: "dt-sec-claude", command: "cmd", args: [],
        disabledTools: ["tool1"],
      });
      mcpInstaller.installMcpServersWithSecrets({});
      const config = JSON.parse(fs.readFileSync(claude.mcpConfigPath, "utf-8"));
      assert.strictEqual(config.mcpServers["dt-sec-claude"].disabledTools, undefined);
    });

    it("should preserve existing preferences in Claude config during secrets sync", () => {
      const pf = require("../scripts/platforms");
      const claude = pf.getByName("claude");
      fs.mkdirSync(claude.configPath, { recursive: true });
      const claudeConfigDir = path.dirname(claude.mcpConfigPath);
      fs.mkdirSync(claudeConfigDir, { recursive: true });

      fs.writeFileSync(claude.mcpConfigPath, JSON.stringify({
        preferences: { autoUpdate: true },
        mcpServers: {},
      }), "utf-8");

      setupMcpServer("pref-sec", { name: "pref-sec", command: "cmd", args: [] });
      mcpInstaller.installMcpServersWithSecrets({});

      const config = JSON.parse(fs.readFileSync(claude.mcpConfigPath, "utf-8"));
      assert.deepStrictEqual(config.preferences, { autoUpdate: true });
      assert.ok(config.mcpServers["pref-sec"]);
    });
  });
});
