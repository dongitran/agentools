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
      ["claude", "antigravity", "antigravity-cli", "cursor", "windsurf", "codex", "copilot"].forEach(n => {
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

    it("should have agentsPath for agent-supporting platforms", () => {
      platforms.SUPPORTED.filter(p => ["claude", "antigravity", "antigravity-cli", "codex"].includes(p.name)).forEach(p => {
        assert.ok(p.agentsPath, `${p.name} should have agentsPath`);
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
    it("should have agentsDir and agentsPath", () => {
      const claude = platforms.getByName("claude");
      assert.strictEqual(claude.agentsDir, "agents");
      assert.ok(claude.agentsPath.includes("agents"));
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
    it("should have rulesType 'folder'", () => {
      const claude = platforms.getByName("claude");
      assert.strictEqual(claude.rulesType, "folder");
    });
    it("should have rulesDir 'rules'", () => {
      const claude = platforms.getByName("claude");
      assert.strictEqual(claude.rulesDir, "rules");
    });
    it("should have rulesPath pointing to ~/.claude/rules/", () => {
      const claude = platforms.getByName("claude");
      assert.ok(claude.rulesPath.endsWith(path.join(".claude", "rules")));
    });

    describe("hooks", () => {
      it("should convert agent.json to .md in onAgentInstalled", () => {
        const claude = platforms.getByName("claude");
        const agentName = "test-agent";
        const destPath = path.join(env.tmpDir, "claude-test-agent");
        
        fs.mkdirSync(destPath, { recursive: true });
        fs.writeFileSync(path.join(destPath, "agent.json"), JSON.stringify({
          name: "custom-name",
          description: "A test agent",
          model: "claude-3-5-sonnet",
          skills: ["skill1", { name: "skill2" }],
          instructions: "Do things.",
        }));
        
        const context = { fs, path };
        const result = claude.hooks.onAgentInstalled(agentName, destPath, null, context);
        
        assert.strictEqual(result, true);
        assert.ok(!fs.existsSync(destPath), "Directory should be removed");
        
        const mdPath = path.join(env.tmpDir, "test-agent.md");
        assert.ok(fs.existsSync(mdPath), "Markdown file should be created");
        
        const mdContent = fs.readFileSync(mdPath, "utf-8");
        assert.ok(mdContent.includes("name: custom-name"));
        assert.ok(mdContent.includes('description: "A test agent"'));
        assert.ok(mdContent.includes("model: claude-3-5-sonnet"));
        assert.ok(mdContent.includes("- skill1"));
        assert.ok(mdContent.includes("- skill2"));
        assert.ok(mdContent.includes("<!-- @agentools-managed -->"));
        assert.ok(mdContent.includes("Do things."));
      });
      
      it("should clean up managed .md files in cleanupAgents", () => {
        const claude = platforms.getByName("claude");
        const agentsPath = path.join(env.tmpDir, "claude-agents-cleanup");
        fs.mkdirSync(agentsPath, { recursive: true });
        
        fs.writeFileSync(path.join(agentsPath, "remove-me.md"), "---\nname: remove-me\n---\n<!-- @agentools-managed -->\nInstructions");
        fs.writeFileSync(path.join(agentsPath, "keep-me.md"), "---\nname: keep-me\n---\n<!-- @agentools-managed -->\nInstructions");
        fs.writeFileSync(path.join(agentsPath, "user-agent.md"), "---\nname: user-agent\n---\nUser created this");
        
        const context = { fs, path };
        const mutated = claude.hooks.cleanupAgents(["keep-me"], null, context, agentsPath);
        
        assert.strictEqual(mutated, true);
        assert.ok(!fs.existsSync(path.join(agentsPath, "remove-me.md")));
        assert.ok(fs.existsSync(path.join(agentsPath, "keep-me.md")));
        assert.ok(fs.existsSync(path.join(agentsPath, "user-agent.md")));
      });

      it("should clean up legacy directories in cleanupAgents", () => {
        const claude = platforms.getByName("claude");
        const agentsPath = path.join(env.tmpDir, "claude-legacy-cleanup");
        fs.mkdirSync(agentsPath, { recursive: true });
        
        const removeDir = path.join(agentsPath, "legacy-remove");
        fs.mkdirSync(removeDir, { recursive: true });
        fs.writeFileSync(path.join(removeDir, ".agentools-managed"), "");
        
        const keepDir = path.join(agentsPath, "legacy-keep");
        fs.mkdirSync(keepDir, { recursive: true });
        fs.writeFileSync(path.join(keepDir, ".agentools-managed"), "");

        const context = { fs, path };
        const mutated = claude.hooks.cleanupAgents(["legacy-keep"], null, context, agentsPath);
        
        assert.strictEqual(mutated, true);
        assert.ok(!fs.existsSync(removeDir));
        assert.ok(fs.existsSync(keepDir));
      });
    });
  });

  describe("Antigravity platform", () => {
    it("should have workflowsDir and workflowsPath", () => {
      const ag = platforms.getByName("antigravity");
      assert.strictEqual(ag.workflowsDir, "global_workflows");
      assert.ok(ag.workflowsPath.includes("global_workflows"));
    });
    it("should have agentsDir and agentsPath", () => {
      const ag = platforms.getByName("antigravity");
      assert.strictEqual(ag.agentsDir, "agents");
      assert.ok(ag.agentsPath.includes("agents"));
    });
    it("should have mcpConfigPath", () => {
      const ag = platforms.getByName("antigravity");
      assert.ok(ag.mcpConfigPath.includes("mcp_config.json"));
    });
    it("should detect based on Antigravity IDE config dir", () => {
      const ag = platforms.getByName("antigravity");
      fs.mkdirSync(ag.configPath, { recursive: true });
      assert.strictEqual(ag.detect(), true);
    });
    it("should not infer the IDE from a shared .gemini dir", () => {
      const ag = platforms.getByName("antigravity");
      const geminiDir = path.join(env.tmpDir, ".gemini");
      const originalExistsSync = fs.existsSync;

      fs.existsSync = (candidate) => candidate === geminiDir;
      try {
        assert.strictEqual(ag.detect(), false);
      } finally {
        fs.existsSync = originalExistsSync;
      }
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
    it("should have rulesType 'file'", () => {
      const ag = platforms.getByName("antigravity");
      assert.strictEqual(ag.rulesType, "file");
    });
    it("should have rulesFile 'GEMINI.md'", () => {
      const ag = platforms.getByName("antigravity");
      assert.strictEqual(ag.rulesFile, "GEMINI.md");
    });
    it("should have rulesPath pointing to ~/.gemini/GEMINI.md", () => {
      const ag = platforms.getByName("antigravity");
      assert.ok(ag.rulesPath.endsWith(path.join(".gemini", "GEMINI.md")));
    });
  });

  describe("Antigravity CLI platform", () => {
    it("should use the documented global paths", () => {
      const cli = platforms.getByName("antigravity-cli");

      assert.ok(cli.configPath.endsWith(path.join(".gemini", "antigravity-cli")));
      assert.ok(cli.skillsPath.endsWith(path.join(".gemini", "antigravity-cli", "skills")));
      assert.ok(cli.agentsPath.endsWith(path.join(".gemini", "antigravity-cli", "agents")));
      assert.ok(cli.mcpConfigPath.endsWith(path.join(".gemini", "antigravity-cli", "mcp_config.json")));
      assert.ok(cli.rulesPath.endsWith(path.join(".gemini", "GEMINI.md")));
    });

    it("should install workflows as skills", () => {
      const cli = platforms.getByName("antigravity-cli");
      assert.strictEqual(cli.workflowsAsSkills, true);
      assert.strictEqual(cli.workflowsPath, undefined);
    });

    it("should detect an initialized CLI config directory", () => {
      const cli = platforms.getByName("antigravity-cli");
      fs.mkdirSync(cli.configPath, { recursive: true });
      assert.strictEqual(cli.detect(), true);
    });

    it("should detect the official default binary location", () => {
      const cli = platforms.getByName("antigravity-cli");
      if (fs.existsSync(cli.configPath)) {
        fs.rmSync(cli.configPath, { recursive: true, force: true });
      }
      fs.mkdirSync(path.dirname(cli.executablePath), { recursive: true });
      fs.writeFileSync(cli.executablePath, "");
      assert.strictEqual(cli.detect(), true);
    });

    it("should expose the platform-specific default executable path", () => {
      const cli = platforms.getByName("antigravity-cli");
      const expectedSuffix = process.platform === "win32"
        ? path.join("agy", "bin", "agy.exe")
        : path.join(".local", "bin", "agy");

      assert.ok(cli.executablePath.endsWith(expectedSuffix));
    });

    it("should detect a custom install available on PATH", () => {
      const cli = platforms.getByName("antigravity-cli");
      const customBinDir = createTempDir();
      const executableName = process.platform === "win32" ? "agy.exe" : "agy";
      const originalPath = process.env.PATH;

      if (fs.existsSync(cli.configPath)) {
        fs.rmSync(cli.configPath, { recursive: true, force: true });
      }
      if (fs.existsSync(cli.executablePath)) {
        fs.rmSync(cli.executablePath, { force: true });
      }
      fs.writeFileSync(path.join(customBinDir, executableName), "");
      process.env.PATH = customBinDir;

      try {
        assert.strictEqual(cli.detect(), true);
      } finally {
        process.env.PATH = originalPath;
        fs.rmSync(customBinDir, { recursive: true, force: true });
      }
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
    it("should have rulesType 'folder'", () => {
      const cursor = platforms.getByName("cursor");
      assert.strictEqual(cursor.rulesType, "folder");
    });
  });

  describe("Windsurf platform", () => {
    it("should detect based on .windsurf dir", () => {
      const ws = platforms.getByName("windsurf");
      fs.mkdirSync(ws.configPath, { recursive: true });
      assert.strictEqual(ws.detect(), true);
    });
    it("should have rulesType 'file'", () => {
      const ws = platforms.getByName("windsurf");
      assert.strictEqual(ws.rulesType, "file");
    });
    it("should have rulesFile 'global_rules.md'", () => {
      const ws = platforms.getByName("windsurf");
      assert.strictEqual(ws.rulesFile, "global_rules.md");
    });
    it("should have rulesPath pointing to memories/global_rules.md", () => {
      const ws = platforms.getByName("windsurf");
      assert.ok(ws.rulesPath.includes("memories"));
      assert.ok(ws.rulesPath.endsWith("global_rules.md"));
    });
  });

  describe("Codex platform", () => {
    it("should detect based on .codex dir", () => {
      const codex = platforms.getByName("codex");
      fs.mkdirSync(codex.configPath, { recursive: true });
      assert.strictEqual(codex.detect(), true);
    });
    it("should have agentsDir and agentsPath", () => {
      const codex = platforms.getByName("codex");
      assert.strictEqual(codex.agentsDir, "agents");
      assert.ok(codex.agentsPath.includes("agents"));
    });
    it("should have rulesType 'file'", () => {
      const codex = platforms.getByName("codex");
      assert.strictEqual(codex.rulesType, "file");
    });
    it("should have rulesFile 'AGENTS.md'", () => {
      const codex = platforms.getByName("codex");
      assert.strictEqual(codex.rulesFile, "AGENTS.md");
    });
    it("should have rulesPath pointing to ~/.codex/AGENTS.md", () => {
      const codex = platforms.getByName("codex");
      assert.ok(codex.rulesPath.endsWith(path.join(".codex", "AGENTS.md")));
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
      assert.ok(names.includes("antigravity-cli"));
      assert.ok(names.length >= 7);
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

  describe("ensureRulesDir", () => {
    it("should create and return rules path for folder-type platform", () => {
      const claude = platforms.getByName("claude");
      const p = platforms.ensureRulesDir(claude);
      assert.ok(p);
      assert.ok(p.includes("rules"));
      assert.ok(fs.existsSync(p));
    });
    it("should return null for file-type platform", () => {
      const ag = platforms.getByName("antigravity");
      assert.strictEqual(platforms.ensureRulesDir(ag), null);
    });
    it("should return null for platform without rulesPath", () => {
      const cp = platforms.getByName("copilot");
      assert.strictEqual(platforms.ensureRulesDir(cp), null);
    });
    it("should not fail if directory already exists", () => {
      const cursor = platforms.getByName("cursor");
      platforms.ensureRulesDir(cursor);
      const p = platforms.ensureRulesDir(cursor);
      assert.ok(fs.existsSync(p));
    });
  });

  describe("HOME export", () => {
    it("should export HOME constant", () => {
      assert.ok(platforms.HOME);
      assert.strictEqual(typeof platforms.HOME, "string");
    });
  });
});
