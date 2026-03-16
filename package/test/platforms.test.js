const { describe, it, before, after } = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const { setupTestHome, freshRequire, createTempDir } = require("./helpers");

describe("Platforms Module", () => {
  let env, platforms;

  before(() => {
    env = setupTestHome();
    platforms = freshRequire("../scripts/platforms");
  });

  after(() => { env.cleanup(); });

  describe("SUPPORTED platforms", () => {
    it("should have all required platforms", () => {
      const names = platforms.SUPPORTED.map(p => p.name);
      ["claude", "antigravity", "cursor", "windsurf", "codex", "copilot"].forEach(n => {
        assert.ok(names.includes(n), `Should include ${n}`);
      });
    });

    it("should have required properties", () => {
      platforms.SUPPORTED.forEach(p => {
        assert.ok(p.name);
        assert.ok(p.displayName);
        assert.ok(typeof p.detect === "function");
      });
    });

    it("should have configPath getter", () => {
      platforms.SUPPORTED.forEach(p => {
        assert.ok(p.configPath, `${p.name} should have configPath`);
      });
    });

    it("should have skillsPath for non-copilot platforms", () => {
      platforms.SUPPORTED.filter(p => p.name !== "copilot").forEach(p => {
        assert.ok(p.skillsPath, `${p.name} should have skillsPath`);
      });
    });
  });

  describe("Claude Code platform", () => {
    it("should have workflowsDir and workflowsPath", () => {
      const claude = platforms.getByName("claude");
      assert.strictEqual(claude.workflowsDir, "workflows");
      assert.ok(claude.workflowsPath.includes("workflows"));
    });
    it("should have commandsDir and commandsPath", () => {
      const claude = platforms.getByName("claude");
      assert.strictEqual(claude.commandsDir, "commands");
      assert.ok(claude.commandsPath.includes("commands"));
    });
    it("should detect based on .claude dir", () => {
      const claude = platforms.getByName("claude");
      fs.mkdirSync(claude.configPath, { recursive: true });
      assert.strictEqual(claude.detect(), true);
    });
    it("should have mcpConfigPath pointing to .claude.json", () => {
      const claude = platforms.getByName("claude");
      assert.ok(claude.mcpConfigPath);
      assert.ok(claude.mcpConfigPath.endsWith(".claude.json"));
    });
    it("should return cross-platform mcpConfigPath", () => {
      const claude = platforms.getByName("claude");
      const mcpPath = claude.mcpConfigPath;
      // Claude Code CLI uses ~/.claude.json on all platforms
      assert.ok(mcpPath.includes(".claude.json"));
    });
  });

  describe("Antigravity platform", () => {
    it("should have workflowsDir and workflowsPath", () => {
      const ag = platforms.getByName("antigravity");
      assert.strictEqual(ag.workflowsDir, "global_workflows");
      assert.ok(ag.workflowsPath.includes("global_workflows"));
    });
    it("should have mcpConfigPath", () => {
      const ag = platforms.getByName("antigravity");
      assert.ok(ag.mcpConfigPath.includes("mcp_config.json"));
    });
    it("should detect based on .gemini dir", () => {
      const ag = platforms.getByName("antigravity");
      fs.mkdirSync(path.join(env.tmpDir, ".gemini"), { recursive: true });
      assert.strictEqual(ag.detect(), true);
    });
    it("should detect Antigravity ONLY via ~/Applications path (line 63)", () => {
      // Critical: Delete .gemini and /Applications/Antigravity.app to avoid short-circuit
      // This forces evaluation of line 63: path.join(HOME, "Applications", "Antigravity.app")
      const geminiDir = path.join(env.tmpDir, ".gemini");
      const globalApp = "/Applications/Antigravity.app";
      if (fs.existsSync(geminiDir)) fs.rmSync(geminiDir, { recursive: true, force: true });
      // /Applications/Antigravity.app won't exist in test env anyway

      const ag = platforms.getByName("antigravity");
      const appPath = path.join(env.tmpDir, "Applications", "Antigravity.app");
      fs.mkdirSync(appPath, { recursive: true });
      assert.strictEqual(ag.detect(), true);
    });
  });

  describe("Cursor platform", () => {
    it("should have rulesPath", () => {
      const cursor = platforms.getByName("cursor");
      assert.ok(cursor.rulesPath.includes("rules"));
    });
    it("should detect based on .cursor dir", () => {
      const cursor = platforms.getByName("cursor");
      fs.mkdirSync(cursor.configPath, { recursive: true });
      assert.strictEqual(cursor.detect(), true);
    });
    it("should detect Cursor ONLY via ~/Applications path (line 86)", () => {
      // Critical: Delete .cursor dir to avoid short-circuit
      // This forces evaluation of line 86: path.join(HOME, "Applications", "Cursor.app")
      const cursor = platforms.getByName("cursor");
      const cursorDir = cursor.configPath; // path.join(HOME, ".cursor")
      if (fs.existsSync(cursorDir)) fs.rmSync(cursorDir, { recursive: true, force: true });

      const appPath = path.join(env.tmpDir, "Applications", "Cursor.app");
      fs.mkdirSync(appPath, { recursive: true });
      assert.strictEqual(cursor.detect(), true);
    });
  });

  describe("Windsurf platform", () => {
    it("should detect based on .windsurf dir", () => {
      const ws = platforms.getByName("windsurf");
      fs.mkdirSync(ws.configPath, { recursive: true });
      assert.strictEqual(ws.detect(), true);
    });
  });

  describe("Codex platform", () => {
    it("should detect based on .codex dir", () => {
      const codex = platforms.getByName("codex");
      fs.mkdirSync(codex.configPath, { recursive: true });
      assert.strictEqual(codex.detect(), true);
    });
  });

  describe("Copilot platform", () => {
    it("should have instructionsPath", () => {
      const cp = platforms.getByName("copilot");
      assert.ok(cp.instructionsPath.includes("copilot-instructions.md"));
    });
    it("should detect based on copilot-instructions.md file", () => {
      const cp = platforms.getByName("copilot");
      fs.mkdirSync(cp.configPath, { recursive: true });
      fs.writeFileSync(cp.instructionsPath, "# Copilot Instructions");
      assert.strictEqual(cp.detect(), true);
    });
    it("should NOT detect when only .github dir exists (no false positive)", () => {
      const cp = platforms.getByName("copilot");
      // Clean up any existing instructions file from previous tests
      if (fs.existsSync(cp.instructionsPath)) {
        fs.unlinkSync(cp.instructionsPath);
      }
      fs.mkdirSync(cp.configPath, { recursive: true });
      assert.strictEqual(cp.detect(), false);
    });
  });

  describe("getByName", () => {
    it("should return platform by name", () => {
      const claude = platforms.getByName("claude");
      assert.ok(claude);
      assert.strictEqual(claude.name, "claude");
    });
    it("should be case-insensitive", () => {
      assert.ok(platforms.getByName("Claude"));
      assert.ok(platforms.getByName("CURSOR"));
    });
    it("should return null for unknown", () => {
      assert.strictEqual(platforms.getByName("nonexistent"), null);
    });
  });

  describe("getAllNames", () => {
    it("should return all platform names", () => {
      const names = platforms.getAllNames();
      assert.ok(Array.isArray(names));
      assert.ok(names.includes("claude"));
      assert.ok(names.includes("antigravity"));
      assert.ok(names.length >= 6);
    });
  });

  describe("detectAll", () => {
    it("should return array", () => {
      assert.ok(Array.isArray(platforms.detectAll()));
    });
    it("should detect platforms with created dirs", () => {
      const claude = platforms.getByName("claude");
      fs.mkdirSync(claude.configPath, { recursive: true });
      const detected = platforms.detectAll();
      assert.ok(detected.some(p => p.name === "claude"));
    });
    it("should return objects with required properties", () => {
      const claude = platforms.getByName("claude");
      fs.mkdirSync(claude.configPath, { recursive: true });
      const detected = platforms.detectAll();
      detected.forEach(p => {
        assert.ok(p.name);
        assert.ok(p.displayName);
        assert.ok(p.configPath);
      });
    });
  });

  describe("ensureSkillsDir", () => {
    it("should create and return skills path", () => {
      const claude = platforms.getByName("claude");
      const p = platforms.ensureSkillsDir(claude);
      assert.ok(p.includes("skills"));
      assert.ok(fs.existsSync(p));
    });
    it("should not fail if already exists", () => {
      const claude = platforms.getByName("claude");
      platforms.ensureSkillsDir(claude);
      const p = platforms.ensureSkillsDir(claude);
      assert.ok(fs.existsSync(p));
    });
  });

  describe("ensureWorkflowsDir", () => {
    it("should create and return workflows path for claude", () => {
      const claude = platforms.getByName("claude");
      const p = platforms.ensureWorkflowsDir(claude);
      assert.ok(p.includes("workflows"));
      assert.ok(fs.existsSync(p));
    });
    it("should return null for platform without workflowsPath", () => {
      const cursor = platforms.getByName("cursor");
      assert.strictEqual(platforms.ensureWorkflowsDir(cursor), null);
    });
  });

  describe("HOME export", () => {
    it("should export HOME constant", () => {
      assert.ok(platforms.HOME);
      assert.strictEqual(typeof platforms.HOME, "string");
    });
  });
});
