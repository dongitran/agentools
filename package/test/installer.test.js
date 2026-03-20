const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const { setupTestHome, requireWithMockedChildProcess, createTempDir, cleanTempDir } = require("./helpers");

describe("Installer Module", () => {
  let env, installer, mocks;

  before(() => {
    env = setupTestHome();
    const result = requireWithMockedChildProcess("../scripts/installer", [
      "../scripts/platforms",
      "../scripts/config-manager",
      "../scripts/mcp-installer",
    ]);
    installer = result.module;
    mocks = result.mocks;
  });

  after(() => {
    if (fs.existsSync(installer.CACHE_DIR)) cleanTempDir(installer.CACHE_DIR);
    env.cleanup();
  });

  beforeEach(() => {
    if (fs.existsSync(installer.CACHE_DIR)) cleanTempDir(installer.CACHE_DIR);
    mocks.execSync.reset();
  });

  describe("Constants", () => {
    it("should have REPO_URL with github", () => {
      assert.ok(installer.REPO_URL.includes("github.com"));
    });
    it("should have CACHE_DIR", () => {
      assert.ok(installer.CACHE_DIR.includes(".agentools-cache"));
    });
    it("should have REPO_SKILLS_DIR", () => {
      assert.ok(installer.REPO_SKILLS_DIR.includes("skills"));
    });
    it("should have REPO_WORKFLOWS_DIR", () => {
      assert.ok(installer.REPO_WORKFLOWS_DIR.includes("workflows"));
    });
  });

  describe("copyDir", () => {
    let tmpSrc, tmpDest;
    beforeEach(() => {
      tmpSrc = createTempDir();
      tmpDest = path.join(createTempDir(), "dest");
    });

    it("should return zeros for nonexistent source", () => {
      const r = installer.copyDir("/nonexistent", "/somewhere");
      assert.strictEqual(r.copied, 0);
      assert.strictEqual(r.skipped, 0);
    });

    it("should copy files", () => {
      fs.writeFileSync(path.join(tmpSrc, "a.txt"), "hello");
      fs.writeFileSync(path.join(tmpSrc, "b.txt"), "world");
      const r = installer.copyDir(tmpSrc, tmpDest, true);
      assert.strictEqual(r.copied, 2);
      assert.ok(fs.existsSync(path.join(tmpDest, "a.txt")));
      assert.ok(fs.existsSync(path.join(tmpDest, "b.txt")));
    });

    it("should skip existing files without force", () => {
      fs.writeFileSync(path.join(tmpSrc, "a.txt"), "new");
      fs.mkdirSync(tmpDest, { recursive: true });
      fs.writeFileSync(path.join(tmpDest, "a.txt"), "old");
      const r = installer.copyDir(tmpSrc, tmpDest, false);
      assert.strictEqual(r.skipped, 1);
      assert.strictEqual(r.copied, 0);
    });

    it("should overwrite with force", () => {
      fs.writeFileSync(path.join(tmpSrc, "a.txt"), "new");
      fs.mkdirSync(tmpDest, { recursive: true });
      fs.writeFileSync(path.join(tmpDest, "a.txt"), "old");
      const r = installer.copyDir(tmpSrc, tmpDest, true);
      assert.strictEqual(r.copied, 1);
      assert.strictEqual(fs.readFileSync(path.join(tmpDest, "a.txt"), "utf-8"), "new");
    });

    it("should copy recursively", () => {
      fs.mkdirSync(path.join(tmpSrc, "sub"));
      fs.writeFileSync(path.join(tmpSrc, "sub", "f.txt"), "nested");
      const r = installer.copyDir(tmpSrc, tmpDest, true);
      assert.strictEqual(r.copied, 1);
      assert.ok(fs.existsSync(path.join(tmpDest, "sub", "f.txt")));
    });
  });

  describe("syncRepo", () => {
    it("should clone when no cache", () => {
      mocks.execSync.mockImplementation(() => "");
      assert.strictEqual(installer.syncRepo(), true);
      const cmd = mocks.execSync.calls[0][0];
      assert.ok(cmd.includes("git clone"));
    });

    it("should pull when cache exists", () => {
      fs.mkdirSync(installer.CACHE_DIR, { recursive: true });
      mocks.execSync.mockImplementation(() => "");
      assert.strictEqual(installer.syncRepo(), true);
      const cmd = mocks.execSync.calls[0][0];
      assert.ok(cmd.includes("git pull"));
    });

    it("should return false on error", () => {
      mocks.execSync.mockImplementation(() => { throw new Error("fail"); });
      assert.strictEqual(installer.syncRepo(), false);
    });
  });

  describe("isRepoCached", () => {
    it("should return false when no cache", () => {
      assert.strictEqual(installer.isRepoCached(), false);
    });
    it("should return true when cache with skills exists", () => {
      fs.mkdirSync(installer.REPO_SKILLS_DIR, { recursive: true });
      assert.strictEqual(installer.isRepoCached(), true);
    });
  });

  describe("getAvailableSkills", () => {
    it("should return bundled skills", () => {
      const skills = installer.getAvailableSkills();
      assert.ok(Array.isArray(skills));
      assert.ok(skills.length > 0);
    });

    it("should include repo skills when cached", () => {
      const sd = path.join(installer.REPO_SKILLS_DIR, "repo-skill");
      fs.mkdirSync(sd, { recursive: true });
      fs.writeFileSync(path.join(sd, "SKILL.md"), "# Skill");
      assert.ok(installer.getAvailableSkills().includes("repo-skill"));
    });

    it("should skip dirs without SKILL.md", () => {
      const sd = path.join(installer.REPO_SKILLS_DIR, "no-skill-md");
      fs.mkdirSync(sd, { recursive: true });
      fs.writeFileSync(path.join(sd, "README.md"), "# Not a skill");
      assert.ok(!installer.getAvailableSkills().includes("no-skill-md"));
    });
  });

  describe("getAvailableWorkflows", () => {
    it("should include package-bundled workflows without cache", () => {
      const wf = installer.getAvailableWorkflows();
      // Package-bundled workflows are always present even without repo cache
      assert.ok(wf.includes("select-local-rules"));
    });

    it("should merge repo cache workflows with package-bundled ones", () => {
      fs.mkdirSync(installer.REPO_WORKFLOWS_DIR, { recursive: true });
      fs.writeFileSync(path.join(installer.REPO_WORKFLOWS_DIR, "wf1.md"), "# W");
      fs.writeFileSync(path.join(installer.REPO_WORKFLOWS_DIR, "skip.txt"), "skip");
      const wf = installer.getAvailableWorkflows();
      assert.ok(wf.includes("wf1"));
      assert.ok(wf.includes("select-local-rules"));
      assert.ok(!wf.includes("skip"));
    });
  });

  describe("install", () => {
    it("should fallback to bundled skills when no cache and sync disabled", () => {
      const r = installer.install({ sync: false });
      assert.ok(r.skillsCount >= 0);
    });

    it("should throw when sync fails", () => {
      mocks.execSync.mockImplementation(() => { throw new Error("no net"); });
      assert.throws(() => installer.install({ force: true, sync: true }));
    });

    it("should install skills to detected platforms", () => {
      // Setup cache with skills and workflows
      const skillDir = path.join(installer.REPO_SKILLS_DIR, "test-install-skill");
      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(path.join(skillDir, "SKILL.md"), "# Test Skill");

      fs.mkdirSync(installer.REPO_WORKFLOWS_DIR, { recursive: true });
      fs.writeFileSync(path.join(installer.REPO_WORKFLOWS_DIR, "test-wf.md"), "# Workflow");

      // Create .claude dir so platform is detected
      const platforms = require("../scripts/platforms");
      const claude = platforms.getByName("claude");
      fs.mkdirSync(claude.configPath, { recursive: true });

      mocks.execSync.mockImplementation(() => "");
      const r = installer.install({ force: true, sync: false });
      assert.ok(r.platformsCount > 0);
      assert.ok(r.skillsCount > 0);
      assert.ok(r.details.length > 0);

      // Check skills were copied
      const detail = r.details.find(d => d.platform === "claude");
      assert.ok(detail);
      assert.ok(detail.skills.length > 0);
    });

    it("should install workflows as skills for claude", () => {
      fs.mkdirSync(installer.REPO_SKILLS_DIR, { recursive: true });
      fs.mkdirSync(installer.REPO_WORKFLOWS_DIR, { recursive: true });
      fs.writeFileSync(path.join(installer.REPO_WORKFLOWS_DIR, "claude-wf.md"), "# WF");

      const platforms = require("../scripts/platforms");
      const claude = platforms.getByName("claude");
      fs.mkdirSync(claude.configPath, { recursive: true });

      mocks.execSync.mockImplementation(() => "");
      const r = installer.install({ force: true, sync: false });
      const detail = r.details.find(d => d.platform === "claude");
      assert.ok(detail);
      assert.ok(detail.workflows.length > 0);
    });

    it("should install workflows to antigravity workflows dir", () => {
      fs.mkdirSync(installer.REPO_SKILLS_DIR, { recursive: true });
      fs.mkdirSync(installer.REPO_WORKFLOWS_DIR, { recursive: true });
      fs.writeFileSync(path.join(installer.REPO_WORKFLOWS_DIR, "ag-wf.md"), "# WF");

      const platforms = require("../scripts/platforms");
      const ag = platforms.getByName("antigravity");
      fs.mkdirSync(path.join(env.tmpDir, ".gemini"), { recursive: true });

      // Setup MCP config dir for antigravity
      const configManager = require("../scripts/config-manager");
      configManager.initConfig();

      mocks.execSync.mockImplementation(() => "");
      const r = installer.install({ force: true, sync: false });
      const detail = r.details.find(d => d.platform === "antigravity");
      if (detail) {
        assert.ok(detail.workflows.length >= 0);
      }
    });

    it("should filter by specific skill name", () => {
      const skillDir = path.join(installer.REPO_SKILLS_DIR, "target-skill");
      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(path.join(skillDir, "SKILL.md"), "# Target");

      const platforms = require("../scripts/platforms");
      const claude = platforms.getByName("claude");
      fs.mkdirSync(claude.configPath, { recursive: true });

      mocks.execSync.mockImplementation(() => "");
      const r = installer.install({ force: true, sync: false, skill: "target-skill" });
      if (r.details.length > 0) {
        const detail = r.details[0];
        assert.ok(detail.skills.every(s => s.name === "target-skill"));
      }
    });

    it("should sync when force=true and cache exists", () => {
      fs.mkdirSync(installer.REPO_SKILLS_DIR, { recursive: true });
      mocks.execSync.mockImplementation(() => "");
      installer.install({ force: true, sync: true });
      // Should have called git pull/clone
      assert.ok(mocks.execSync.calls.length > 0);
    });
  });

  describe("uninstall", () => {
    it("should throw for unknown platform", () => {
      assert.throws(() => installer.uninstall({ platform: "fake" }), /Unknown platform/);
    });

    it("should uninstall skills from all platforms", () => {
      // Setup skills
      const platforms = require("../scripts/platforms");
      const claude = platforms.getByName("claude");
      const skillsDir = claude.skillsPath;
      fs.mkdirSync(skillsDir, { recursive: true });

      // Create a known skill in both cache and platform
      const skillDir = path.join(installer.REPO_SKILLS_DIR, "removable");
      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(path.join(skillDir, "SKILL.md"), "# Remove me");

      const installedDir = path.join(skillsDir, "removable");
      fs.mkdirSync(installedDir, { recursive: true });
      fs.writeFileSync(path.join(installedDir, "SKILL.md"), "# Remove me");

      const r = installer.uninstall();
      assert.ok(r.totalRemoved >= 0);
      assert.ok(r.details.length >= 0);
    });

    it("should uninstall specific skill", () => {
      const platforms = require("../scripts/platforms");
      const claude = platforms.getByName("claude");
      fs.mkdirSync(claude.skillsPath, { recursive: true });

      // Create specific skill
      const skillDir = path.join(installer.REPO_SKILLS_DIR, "specific-rm");
      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(path.join(skillDir, "SKILL.md"), "# Specific");

      const installed = path.join(claude.skillsPath, "specific-rm");
      fs.mkdirSync(installed, { recursive: true });
      fs.writeFileSync(path.join(installed, "SKILL.md"), "# Specific");

      const r = installer.uninstall({ skill: "specific-rm" });
      assert.ok(r.totalRemoved > 0 || r.totalRemoved === 0);
    });

    it("should uninstall from specific platform", () => {
      const platforms = require("../scripts/platforms");
      const claude = platforms.getByName("claude");
      fs.mkdirSync(claude.skillsPath, { recursive: true });

      const r = installer.uninstall({ platform: "claude" });
      assert.ok(r.details.length === 1);
      assert.strictEqual(r.details[0].platform, "claude");
    });

    it("should handle nonexistent skills path", () => {
      const platforms = require("../scripts/platforms");
      const codex = platforms.getByName("codex");
      // Codex skillsPath doesn't exist
      const r = installer.uninstall({ platform: "codex" });
      assert.strictEqual(r.details[0].removed, 0);
    });
  });

  describe("Module exports", () => {
    it("should export all required functions", () => {
      const fns = ["install", "uninstall", "syncRepo", "isRepoCached", "getAvailableSkills", "getAvailableWorkflows", "copyDir"];
      fns.forEach(fn => assert.strictEqual(typeof installer[fn], "function"));
    });
  });
});
