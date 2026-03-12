const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const { setupTestHome, requireWithMockedChildProcess, createTempDir, cleanTempDir } = require("./helpers");

describe("SyncManager Module", () => {
  let env, SyncManager, mocks;

  before(() => {
    env = setupTestHome();
    const result = requireWithMockedChildProcess("../scripts/sync-manager", [
      "../scripts/config-manager",
      "../scripts/platforms",
    ]);
    SyncManager = result.module;
    mocks = result.mocks;
  });

  after(() => { env.cleanup(); });

  function makeConfig(overrides = {}) {
    return {
      repository: {
        url: "https://github.com/test/repo.git",
        branch: "main",
        local: path.join(env.tmpDir, ".agentools", "sync-repo"),
        autoSync: false,
        ...overrides,
      },
    };
  }

  function createManager(overrides = {}) {
    const config = makeConfig(overrides);
    // Ensure repo dir exists
    fs.mkdirSync(config.repository.local, { recursive: true });
    return new SyncManager(config);
  }

  describe("constructor", () => {
    it("should set config and repoPath", () => {
      const config = makeConfig();
      const sm = new SyncManager(config);
      assert.strictEqual(sm.config, config);
      assert.ok(sm.repoPath);
    });
  });

  describe("expandPath", () => {
    it("should expand ~ to home", () => {
      const sm = new SyncManager(makeConfig({ local: env.tmpDir }));
      const result = sm.expandPath("~/test");
      assert.ok(result.includes(env.tmpDir.replace(/^~/, "")));
      assert.ok(!result.startsWith("~"));
    });

    it("should return null for null input", () => {
      const sm = new SyncManager(makeConfig({ local: env.tmpDir }));
      assert.strictEqual(sm.expandPath(null), null);
    });

    it("should return path unchanged if no ~", () => {
      const sm = new SyncManager(makeConfig({ local: env.tmpDir }));
      assert.strictEqual(sm.expandPath("/absolute/path"), "/absolute/path");
    });
  });

  describe("parseConflicts", () => {
    it("should extract conflict file names", () => {
      const sm = createManager();
      const output = "CONFLICT (content): Merge conflict in file1.txt\nCONFLICT (content): Merge conflict in file2.txt\nOther line";
      const conflicts = sm.parseConflicts(output);
      assert.strictEqual(conflicts.length, 2);
    });

    it("should return empty for no conflicts", () => {
      const sm = createManager();
      assert.deepStrictEqual(sm.parseConflicts("Already up to date."), []);
    });
  });

  describe("hasLocalChanges", () => {
    it("should return true when changes exist", () => {
      const sm = createManager();
      mocks.execSync.mockImplementation(() => "M file.txt\n");
      assert.strictEqual(sm.hasLocalChanges(), true);
    });

    it("should return false when clean", () => {
      const sm = createManager();
      mocks.execSync.mockImplementation(() => "");
      assert.strictEqual(sm.hasLocalChanges(), false);
    });

    it("should return false on error", () => {
      const sm = createManager();
      mocks.execSync.mockImplementation(() => { throw new Error("not a git repo"); });
      assert.strictEqual(sm.hasLocalChanges(), false);
    });
  });

  describe("push", () => {
    beforeEach(() => { mocks.execSync.reset(); mocks.spawnSync.reset(); });

    it("should fail when no repository url", () => {
      const sm = new SyncManager({ repository: { url: null, local: env.tmpDir } });
      const r = sm.push();
      assert.strictEqual(r.pushed, false);
      assert.ok(r.reason.includes("No repository"));
    });

    it("should fail when repo path does not exist", () => {
      const sm = new SyncManager({ repository: { url: "https://x.com", local: "/nonexistent/path", autoSync: false } });
      const r = sm.push();
      assert.strictEqual(r.pushed, false);
      assert.ok(r.reason.includes("not found"));
    });

    it("should fail when no local changes", () => {
      const sm = createManager();
      mocks.execSync.mockImplementation(() => ""); // empty git status
      const r = sm.push();
      assert.strictEqual(r.pushed, false);
      assert.ok(r.reason.includes("No changes"));
    });

    it("should push when changes exist", () => {
      const sm = createManager();
      let callCount = 0;
      mocks.execSync.mockImplementation((cmd) => {
        if (cmd.includes("status")) return "M file.txt\n";
        return "";
      });
      // Create .agents/workflows dir so gitCommit can add it
      fs.mkdirSync(path.join(sm.repoPath, ".agents", "workflows"), { recursive: true });
      const r = sm.push({ message: "test commit" });
      assert.strictEqual(r.pushed, true);
    });

    it("should auto-pull before push when autoSync enabled", () => {
      const sm = createManager({ autoSync: true });
      let statusCalls = 0;
      mocks.execSync.mockImplementation((cmd) => {
        if (cmd.includes("status")) return "M file.txt\n";
        if (cmd.includes("git pull")) return "Already up to date.";
        return "";
      });
      fs.mkdirSync(path.join(sm.repoPath, ".agents", "workflows"), { recursive: true });
      const r = sm.push();
      assert.strictEqual(r.pushed, true);
    });

    it("should fail push if auto-pull fails", () => {
      const sm = createManager({ autoSync: true });
      mocks.execSync.mockImplementation((cmd) => {
        if (cmd.includes("status")) return "M file.txt\n";
        if (cmd.includes("git pull")) throw new Error("pull error");
        return "";
      });
      const r = sm.push();
      assert.strictEqual(r.pushed, false);
    });

    it("should handle error after commit during push", () => {
      const sm = createManager();
      mocks.execSync.mockImplementation((cmd) => {
        if (cmd.includes("status")) return "M file.txt\n";
        return "";
      });
      mocks.spawnSync.mockImplementation((cmd, args) => {
        if (args && args.includes("push")) {
          return { status: 1, stdout: "", stderr: "" };
        }
        return { status: 0, stdout: "", stderr: "" };
      });
      fs.mkdirSync(path.join(sm.repoPath, ".agents", "workflows"), { recursive: true });
      const r = sm.push();
      assert.strictEqual(r.pushed, false);
      assert.ok(r.reason.includes("git push failed"));
    });
  });

  describe("pull", () => {
    beforeEach(() => { mocks.execSync.reset(); });

    it("should throw when no repository url", () => {
      const sm = new SyncManager({ repository: { url: null, local: env.tmpDir } });
      assert.throws(() => sm.pull(), /No repository/);
    });

    it("should throw when repo path does not exist", () => {
      const sm = new SyncManager({ repository: { url: "https://x.com", local: "/nonexistent" } });
      assert.throws(() => sm.pull(), /not found/);
    });

    it("should succeed on clean pull", () => {
      const sm = createManager();
      mocks.execSync.mockImplementation(() => "Already up to date.");
      const r = sm.pull();
      assert.strictEqual(r.pulled, true);
    });

    it("should detect conflicts in output", () => {
      const sm = createManager();
      mocks.execSync.mockImplementation(() => "CONFLICT (content): Merge conflict in test.txt");
      const r = sm.pull();
      assert.strictEqual(r.pulled, false);
      assert.ok(r.conflicts);
    });

    it("should detect conflicts in error", () => {
      const sm = createManager();
      mocks.execSync.mockImplementation(() => { throw new Error("CONFLICT (content): Merge conflict in x.txt"); });
      const r = sm.pull();
      assert.strictEqual(r.pulled, false);
      assert.ok(r.conflicts);
    });

    it("should handle generic pull error", () => {
      const sm = createManager();
      mocks.execSync.mockImplementation(() => { throw new Error("network error"); });
      const r = sm.pull();
      assert.strictEqual(r.pulled, false);
      assert.ok(r.reason);
    });
  });

  describe("sync", () => {
    beforeEach(() => { mocks.execSync.reset(); mocks.spawnSync.reset(); });

    it("should pull then push", () => {
      const sm = createManager();
      mocks.execSync.mockImplementation((cmd) => {
        if (cmd.includes("status")) return "M file.txt\n";
        if (cmd.includes("pull")) return "Already up to date.";
        return "";
      });
      fs.mkdirSync(path.join(sm.repoPath, ".agents", "workflows"), { recursive: true });
      const r = sm.sync({ message: "sync" });
      assert.strictEqual(r.synced, true);
    });

    it("should fail if pull fails", () => {
      const sm = createManager();
      mocks.execSync.mockImplementation(() => { throw new Error("pull fail"); });
      const r = sm.sync();
      assert.strictEqual(r.synced, false);
    });

    it("should fail if push fails after successful pull", () => {
      const sm = createManager();
      let pullCalled = false;
      mocks.execSync.mockImplementation((cmd) => {
        if (cmd.includes("pull")) {
          pullCalled = true;
          return "Already up to date.";
        }
        if (cmd.includes("status") && pullCalled) return "";
        return "";
      });
      const r = sm.sync();
      assert.strictEqual(r.synced, false);
      assert.ok(r.reason.includes("No changes"));
    });
  });

  describe("checkRemoteConflicts", () => {
    beforeEach(() => { mocks.execSync.reset(); mocks.spawnSync.reset(); });

    it("should return changed files", () => {
      const sm = createManager();
      mocks.execSync.mockImplementation(() => ""); // git fetch
      mocks.spawnSync.mockImplementation(() => ({
        status: 0, stdout: "file1.txt\nfile2.txt\n", stderr: ""
      }));
      const files = sm.checkRemoteConflicts();
      assert.strictEqual(files.length, 2);
    });

    it("should return empty on error", () => {
      const sm = createManager();
      mocks.execSync.mockImplementation(() => { throw new Error("fetch failed"); });
      assert.deepStrictEqual(sm.checkRemoteConflicts(), []);
    });
  });

  describe("gitCommit", () => {
    beforeEach(() => { mocks.execSync.reset(); mocks.spawnSync.reset(); });

    it("should ignore nothing-to-commit errors", () => {
      const sm = createManager();
      fs.mkdirSync(path.join(sm.repoPath, ".agents", "workflows"), { recursive: true });
      mocks.execSync.mockImplementation(() => "");
      mocks.spawnSync.mockImplementation((cmd, args) => {
        if (args && args.includes("commit")) {
          return { status: 1, stdout: "nothing to commit, working tree clean", stderr: "" };
        }
        return { status: 0, stdout: "", stderr: "" };
      });
      // Should not throw
      sm.gitCommit("test");
    });

    it("should throw on other git errors", () => {
      const sm = createManager();
      fs.mkdirSync(path.join(sm.repoPath, ".agents", "workflows"), { recursive: true });
      mocks.execSync.mockImplementation(() => "");
      mocks.spawnSync.mockImplementation((cmd, args) => {
        if (args && args.includes("commit")) {
          return { status: 1, stdout: "", stderr: "fatal: something wrong" };
        }
        return { status: 0, stdout: "", stderr: "" };
      });
      assert.throws(() => sm.gitCommit("test"), /fatal/);
    });

    it("should add skills excluding bundled ones", () => {
      const sm = createManager();
      const skillsDir = path.join(sm.repoPath, ".agents", "skills");
      fs.mkdirSync(skillsDir, { recursive: true });
      fs.mkdirSync(path.join(skillsDir, "custom-skill"));
      fs.mkdirSync(path.join(skillsDir, "agentools"));
      fs.mkdirSync(path.join(sm.repoPath, ".agents", "workflows"), { recursive: true });
      mocks.execSync.mockImplementation(() => "");
      sm.gitCommit("test");
      // Skills are now added via spawnSync
      const addCalls = mocks.spawnSync.calls.filter(c =>
        c[1] && c[1][0] === "add" && c[1][1]?.includes(".agents/skills/")
      );
      assert.ok(addCalls.some(c => c[1][1].includes("custom-skill")));
      assert.ok(!addCalls.some(c => c[1][1].includes("agentools")));
    });

    it("should add mcp-servers if dir exists", () => {
      const sm = createManager();
      fs.mkdirSync(path.join(sm.repoPath, ".agents", "workflows"), { recursive: true });
      fs.mkdirSync(path.join(sm.repoPath, ".agents", "mcp-servers"), { recursive: true });
      mocks.execSync.mockImplementation(() => "");
      sm.gitCommit("test");
      const addCalls = mocks.execSync.calls.filter(c => c[0].includes("mcp-servers"));
      assert.ok(addCalls.length > 0);
    });
  });

  describe("gitPush", () => {
    beforeEach(() => { mocks.spawnSync.reset(); });

    it("should push to configured branch", () => {
      const sm = createManager({ branch: "develop" });
      sm.gitPush();
      const pushCall = mocks.spawnSync.calls.find(c => c[1] && c[1].includes("push"));
      assert.ok(pushCall);
      assert.ok(pushCall[1].includes("develop"));
    });

    it("should throw on push failure", () => {
      const sm = createManager();
      mocks.spawnSync.mockImplementation(() => ({ status: 1, stdout: null, stderr: null }));
      assert.throws(() => sm.gitPush(), /git push failed/);
    });
  });

  describe("updateLastSync", () => {
    it("should update lastSync in config", () => {
      const sm = createManager();
      // Init config so setConfigValue works
      const configManager = require("../scripts/config-manager");
      configManager.initConfig();
      sm.updateLastSync();
      const r = configManager.getConfigValue("repository.lastSync");
      assert.ok(r.found);
      assert.ok(r.value);
    });
  });
});
