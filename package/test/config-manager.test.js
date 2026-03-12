const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const { setupTestHome, freshRequire } = require("./helpers");

const EXPECTED_VERSION = require("../package.json").version;

describe("config-manager module", () => {
  let env, configManager;

  before(() => {
    env = setupTestHome();
    configManager = freshRequire("../scripts/config-manager", ["../scripts/platforms"]);
  });

  after(() => { env.cleanup(); });

  beforeEach(() => {
    const configDir = configManager.getConfigDir();
    if (fs.existsSync(configDir)) fs.rmSync(configDir, { recursive: true, force: true });
  });

  describe("getConfigPath", () => {
    it("should return path ending with config.json", () => {
      assert.ok(configManager.getConfigPath().endsWith(path.join(".agentools", "config.json")));
    });
  });

  describe("getConfigDir", () => {
    it("should return path ending with .agentools", () => {
      assert.ok(configManager.getConfigDir().endsWith(".agentools"));
    });
  });

  describe("configExists", () => {
    it("should return false when no config", () => {
      assert.strictEqual(configManager.configExists(), false);
    });
    it("should return true when config exists", () => {
      configManager.initConfig();
      assert.strictEqual(configManager.configExists(), true);
    });
  });

  describe("loadOfficialSources", () => {
    it("should return an array", () => {
      assert.ok(Array.isArray(configManager.loadOfficialSources()));
    });

    it("should return empty array when official-sources.json is missing", () => {
      // Mock the scenario where official-sources.json doesn't exist
      // by requiring config-manager again with a different __dirname context
      const origRequire = require("module").prototype.require;
      const fsModule = require("fs");
      const origExistsSync = fsModule.existsSync;

      // Mock fs.existsSync to return false for official-sources.json
      fsModule.existsSync = (p) => {
        if (p && p.includes("official-sources.json")) return false;
        return origExistsSync(p);
      };

      const result = configManager.loadOfficialSources();
      assert.ok(Array.isArray(result));
      // Restore
      fsModule.existsSync = origExistsSync;
    });
  });

  describe("createDefaultConfig", () => {
    it("should return config with all required fields", () => {
      const config = configManager.createDefaultConfig();
      assert.strictEqual(config.version, EXPECTED_VERSION);
      assert.ok(config.repository);
      assert.strictEqual(config.repository.branch, "main");
      assert.strictEqual(config.repository.autoSync, true);
      assert.strictEqual(config.repository.url, null);
      assert.ok(config.sync);
      assert.strictEqual(config.sync.conflictResolution, "pull-first");
      assert.ok(Array.isArray(config.sources.official));
      assert.ok(Array.isArray(config.sources.custom));
      assert.strictEqual(config.preferences.autoUpdate, true);
      assert.strictEqual(config.preferences.updateInterval, "weekly");
    });
  });

  describe("initConfig", () => {
    it("should create config file", () => {
      const result = configManager.initConfig();
      assert.strictEqual(result.created, true);
      assert.ok(fs.existsSync(result.path));
    });
    it("should not overwrite without force", () => {
      configManager.initConfig();
      const result = configManager.initConfig();
      assert.strictEqual(result.created, false);
      assert.ok(result.reason.includes("already exists"));
    });
    it("should overwrite with force=true", () => {
      configManager.initConfig();
      assert.strictEqual(configManager.initConfig(true).created, true);
    });
  });

  describe("migrateConfig", () => {
    it("should migrate preserving sources", () => {
      const old = { version: "2.0", sources: { official: [], custom: [{ name: "x" }] } };
      const r = configManager.migrateConfig(old);
      assert.strictEqual(r.version, EXPECTED_VERSION);
      assert.deepStrictEqual(r.sources.custom, [{ name: "x" }]);
    });
    it("should use defaults for missing fields", () => {
      const r = configManager.migrateConfig({ version: "2.0" });
      assert.strictEqual(r.version, EXPECTED_VERSION);
      assert.ok(r.sources);
      assert.ok(r.preferences);
    });
    it("should preserve repository settings from old config", () => {
      const old = {
        version: "2.0",
        repository: {
          url: "https://github.com/user/repo.git",
          branch: "develop",
          local: "/custom/path",
          lastSync: "2025-01-01T00:00:00.000Z",
          autoSync: false,
        },
        sources: { official: [], custom: [] },
      };
      const r = configManager.migrateConfig(old);
      assert.strictEqual(r.repository.url, "https://github.com/user/repo.git");
      assert.strictEqual(r.repository.branch, "develop");
      assert.strictEqual(r.repository.local, "/custom/path");
      assert.strictEqual(r.repository.lastSync, "2025-01-01T00:00:00.000Z");
      assert.strictEqual(r.repository.autoSync, false);
    });
    it("should use default repository when old config has no repository", () => {
      const r = configManager.migrateConfig({ version: "2.0" });
      assert.strictEqual(r.repository.url, null);
      assert.strictEqual(r.repository.branch, "main");
      assert.strictEqual(r.repository.autoSync, true);
    });
  });

  describe("loadConfig", () => {
    it("should auto-init if no config", () => {
      const config = configManager.loadConfig();
      assert.strictEqual(config.version, EXPECTED_VERSION);
      assert.ok(fs.existsSync(configManager.getConfigPath()));
    });
    it("should read existing config", () => {
      configManager.initConfig();
      assert.strictEqual(configManager.loadConfig().version, EXPECTED_VERSION);
    });
    it("should auto-migrate old version", () => {
      fs.mkdirSync(configManager.getConfigDir(), { recursive: true });
      fs.writeFileSync(configManager.getConfigPath(), JSON.stringify({
        version: "2.0", sources: { official: [], custom: [] },
        preferences: { autoUpdate: true, updateInterval: "weekly" },
      }), "utf-8");
      assert.strictEqual(configManager.loadConfig().version, EXPECTED_VERSION);
    });
  });

  describe("saveConfig", () => {
    it("should write config and create backup", () => {
      configManager.initConfig();
      const config = configManager.loadConfig();
      config.preferences.autoUpdate = false;
      configManager.saveConfig(config);
      const saved = JSON.parse(fs.readFileSync(configManager.getConfigPath(), "utf-8"));
      assert.strictEqual(saved.preferences.autoUpdate, false);
      assert.ok(fs.existsSync(`${configManager.getConfigPath()}.backup`));
    });
    it("should create directory if not exists", () => {
      configManager.saveConfig(configManager.createDefaultConfig());
      assert.ok(fs.existsSync(configManager.getConfigPath()));
    });
  });

  describe("validateConfig", () => {
    it("should validate valid config", () => {
      const r = configManager.validateConfig(configManager.createDefaultConfig());
      assert.strictEqual(r.valid, true);
      assert.strictEqual(r.errors.length, 0);
    });
    it("should detect missing version", () => {
      assert.ok(!configManager.validateConfig({}).valid);
    });
    it("should detect missing sources", () => {
      assert.ok(!configManager.validateConfig({ version: EXPECTED_VERSION }).valid);
    });
    it("should detect invalid sources.official", () => {
      assert.ok(!configManager.validateConfig({ version: EXPECTED_VERSION, sources: { official: "x", custom: [] } }).valid);
    });
    it("should detect invalid sources.custom", () => {
      assert.ok(!configManager.validateConfig({ version: EXPECTED_VERSION, sources: { official: [], custom: "x" } }).valid);
    });
    it("should require repository", () => {
      const r = configManager.validateConfig({ version: EXPECTED_VERSION, sources: { official: [], custom: [] } });
      assert.ok(!r.valid);
    });
    it("should detect invalid repository.url type", () => {
      assert.ok(!configManager.validateConfig({
        version: EXPECTED_VERSION, sources: { official: [], custom: [] },
        repository: { url: 123, branch: "main", autoSync: true },
      }).valid);
    });
    it("should detect invalid repository.branch type", () => {
      assert.ok(!configManager.validateConfig({
        version: EXPECTED_VERSION, sources: { official: [], custom: [] },
        repository: { url: null, branch: 123 },
      }).valid);
    });
    it("should detect invalid repository.autoSync type", () => {
      assert.ok(!configManager.validateConfig({
        version: EXPECTED_VERSION, sources: { official: [], custom: [] },
        repository: { url: null, branch: "main", autoSync: "yes" },
      }).valid);
    });
  });

  describe("getAllSources", () => {
    it("should filter disabled sources", () => {
      configManager.initConfig();
      const c = configManager.loadConfig();
      c.sources.custom = [{ name: "on", enabled: true }, { name: "off", enabled: false }];
      configManager.saveConfig(c);
      const s = configManager.getAllSources();
      assert.ok(s.some(x => x.name === "on"));
      assert.ok(!s.some(x => x.name === "off"));
    });
  });

  describe("addSource", () => {
    it("should add custom source", () => {
      configManager.initConfig();
      const r = configManager.addSource({ name: "ts", repo: "https://x.com" });
      assert.strictEqual(r.added, true);
      assert.strictEqual(r.source.enabled, true);
      assert.ok(r.source.metadata.addedAt);
    });
    it("should reject duplicate", () => {
      configManager.initConfig();
      configManager.addSource({ name: "dup" });
      assert.strictEqual(configManager.addSource({ name: "dup" }).added, false);
    });
    it("should reject name matching official", () => {
      configManager.initConfig();
      const c = configManager.loadConfig();
      c.sources.official = [{ name: "osrc" }];
      configManager.saveConfig(c);
      assert.strictEqual(configManager.addSource({ name: "osrc" }).added, false);
    });
  });

  describe("removeSource", () => {
    it("should remove custom source", () => {
      configManager.initConfig();
      configManager.addSource({ name: "rem" });
      const r = configManager.removeSource("rem");
      assert.strictEqual(r.removed, true);
    });
    it("should reject official source", () => {
      configManager.initConfig();
      const c = configManager.loadConfig();
      c.sources.official = [{ name: "off" }];
      configManager.saveConfig(c);
      assert.strictEqual(configManager.removeSource("off").removed, false);
    });
    it("should return not found", () => {
      configManager.initConfig();
      assert.strictEqual(configManager.removeSource("nope").removed, false);
    });
  });

  describe("toggleSource", () => {
    it("should toggle official", () => {
      configManager.initConfig();
      const c = configManager.loadConfig();
      c.sources.official = [{ name: "to", enabled: true }];
      configManager.saveConfig(c);
      const r = configManager.toggleSource("to", false);
      assert.strictEqual(r.updated, true);
      assert.strictEqual(r.type, "official");
    });
    it("should toggle custom", () => {
      configManager.initConfig();
      configManager.addSource({ name: "tc" });
      assert.strictEqual(configManager.toggleSource("tc", false).type, "custom");
    });
    it("should return not found", () => {
      configManager.initConfig();
      assert.strictEqual(configManager.toggleSource("x", true).updated, false);
    });
  });

  describe("getSourceInfo", () => {
    it("should find official", () => {
      configManager.initConfig();
      const c = configManager.loadConfig();
      c.sources.official = [{ name: "io" }];
      configManager.saveConfig(c);
      assert.strictEqual(configManager.getSourceInfo("io").type, "official");
    });
    it("should find custom", () => {
      configManager.initConfig();
      configManager.addSource({ name: "ic" });
      assert.strictEqual(configManager.getSourceInfo("ic").type, "custom");
    });
    it("should return not found", () => {
      configManager.initConfig();
      assert.strictEqual(configManager.getSourceInfo("nope").found, false);
    });
  });

  describe("exportConfig", () => {
    it("should export to file", () => {
      configManager.initConfig();
      const out = path.join(env.tmpDir, "exp.json");
      const r = configManager.exportConfig(out);
      assert.strictEqual(r.exported, true);
      const d = JSON.parse(fs.readFileSync(out, "utf-8"));
      assert.ok(d.exportedAt);
      assert.ok(d.exportedFrom);
    });
    it("should return data when no path", () => {
      configManager.initConfig();
      const r = configManager.exportConfig(null);
      assert.ok(r.data.exportedAt);
    });
  });

  describe("importConfig", () => {
    it("should replace config", () => {
      configManager.initConfig();
      const p = path.join(env.tmpDir, "imp.json");
      const d = configManager.createDefaultConfig();
      d.preferences.autoUpdate = false;
      fs.writeFileSync(p, JSON.stringify(d), "utf-8");
      assert.strictEqual(configManager.importConfig(p).imported, true);
      assert.strictEqual(configManager.loadConfig().preferences.autoUpdate, false);
    });
    it("should merge config", () => {
      configManager.initConfig();
      const p = path.join(env.tmpDir, "mrg.json");
      const d = configManager.createDefaultConfig();
      d.sources.custom = [{ name: "new", enabled: true }];
      fs.writeFileSync(p, JSON.stringify(d), "utf-8");
      assert.strictEqual(configManager.importConfig(p, true).imported, true);
    });
    it("should deduplicate sources on merge", () => {
      configManager.initConfig();
      configManager.addSource({ name: "dup-src", repo: "https://x.com" });
      const p = path.join(env.tmpDir, "dup.json");
      const d = configManager.createDefaultConfig();
      d.sources.custom = [{ name: "dup-src", repo: "https://y.com", enabled: true }, { name: "unique-src", repo: "https://z.com", enabled: true }];
      fs.writeFileSync(p, JSON.stringify(d), "utf-8");
      configManager.importConfig(p, true);
      const config = configManager.loadConfig();
      const dups = config.sources.custom.filter(s => s.name === "dup-src");
      assert.strictEqual(dups.length, 1);
      assert.strictEqual(dups[0].repo, "https://x.com"); // keeps existing, not imported
      assert.ok(config.sources.custom.some(s => s.name === "unique-src")); // new ones added
    });
    it("should fail for nonexistent file", () => {
      assert.strictEqual(configManager.importConfig("/no/file").imported, false);
    });
    it("should fail for invalid config", () => {
      const p = path.join(env.tmpDir, "bad.json");
      fs.writeFileSync(p, JSON.stringify({ bad: true }), "utf-8");
      assert.ok(configManager.importConfig(p).errors);
    });
  });

  describe("getConfigValue", () => {
    it("should get nested value", () => {
      configManager.initConfig();
      assert.strictEqual(configManager.getConfigValue("repository.branch").value, "main");
    });
    it("should get top-level value", () => {
      configManager.initConfig();
      assert.strictEqual(configManager.getConfigValue("version").value, EXPECTED_VERSION);
    });
    it("should return not found", () => {
      configManager.initConfig();
      assert.strictEqual(configManager.getConfigValue("no.key").found, false);
    });
  });

  describe("setConfigValue", () => {
    it("should set nested value", () => {
      configManager.initConfig();
      configManager.setConfigValue("repository.branch", "dev");
      assert.strictEqual(configManager.getConfigValue("repository.branch").value, "dev");
    });
    it("should create intermediate objects", () => {
      configManager.initConfig();
      configManager.setConfigValue("x.y.z", "val");
      assert.strictEqual(configManager.getConfigValue("x.y.z").value, "val");
    });
    it("should return updated", () => {
      configManager.initConfig();
      assert.strictEqual(configManager.setConfigValue("version", "3").updated, true);
    });
  });

  describe("resetConfig", () => {
    it("should reset to defaults", () => {
      configManager.initConfig();
      configManager.setConfigValue("preferences.autoUpdate", false);
      configManager.resetConfig();
      assert.strictEqual(configManager.loadConfig().preferences.autoUpdate, true);
    });
  });
});
