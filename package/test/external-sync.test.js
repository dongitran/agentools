const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const { setupTestHome, requireWithMockedChildProcess, createTempDir } = require("./helpers");

describe("External Sync Module", () => {
  let env, externalSync, mocks, configManager;

  before(() => {
    env = setupTestHome();
    const result = requireWithMockedChildProcess("../scripts/external-sync", [
      "../scripts/config-manager",
      "../scripts/platforms",
    ]);
    externalSync = result.module;
    mocks = result.mocks;
    configManager = require("../scripts/config-manager");
  });

  after(() => { env.cleanup(); });

  beforeEach(() => {
    const dir = configManager.getConfigDir();
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    configManager.initConfig();
    mocks.execSync.reset();
    mocks.spawnSync.reset();
  });

  describe("loadConfig", () => {
    it("should return sources and targetDir", () => {
      const config = externalSync.loadConfig();
      assert.ok(config.sources);
      assert.ok(config.targetDir);
    });
  });

  describe("syncAll", () => {
    it("should return results object", () => {
      // No sources to sync
      const r = externalSync.syncAll();
      assert.ok(typeof r.synced === "number");
      assert.ok(typeof r.copied === "number");
      assert.ok(typeof r.skipped === "number");
      assert.ok(typeof r.failed === "number");
    });

    it("should sync from configured sources", () => {
      configManager.addSource({
        name: "test-ext",
        repo: "https://github.com/test/repo.git",
        branch: "main",
        skills: [{ name: "skill1", path: "skills/skill1" }],
      });
      mocks.execSync.mockImplementation(() => "");
      // Create fake cached repo
      const cacheDir = path.join(env.tmpDir, ".agentools-external-cache", "test-ext", "skills", "skill1");
      fs.mkdirSync(cacheDir, { recursive: true });
      fs.writeFileSync(path.join(cacheDir, "SKILL.md"), "# Skill");

      const r = externalSync.syncAll();
      assert.ok(r.synced > 0);
    });

    it("should filter by source name", () => {
      configManager.addSource({
        name: "src1", repo: "https://x.com", branch: "main", skills: [],
      });
      mocks.execSync.mockImplementation(() => "");
      const r = externalSync.syncAll({ source: "src1" });
      assert.ok(r.synced >= 0);
    });

    it("should throw for unknown source filter", () => {
      assert.throws(() => externalSync.syncAll({ source: "nonexistent" }), /not found/);
    });

    it("should handle sync repo failure", () => {
      configManager.addSource({
        name: "fail-src", repo: "https://x.com", branch: "main", skills: [],
      });
      mocks.spawnSync.mockImplementation(() => ({
        status: 1, stdout: "", stderr: "clone failed"
      }));
      const r = externalSync.syncAll();
      assert.strictEqual(r.failed, 1);
    });
  });

  describe("list", () => {
    it("should list available external skills", () => {
      configManager.addSource({
        name: "list-src", repo: "https://x.com", branch: "main",
        license: "MIT",
        skills: [{ name: "s1", path: "skills/s1" }],
      });
      // Should not throw
      externalSync.list();
    });
  });
});
