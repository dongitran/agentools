const { describe, it, before, after } = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const { setupTestHome, createTempDir, cleanTempDir, freshRequire } = require("./helpers");

describe("Rules Installer Module", () => {
  let env, rulesInstaller, testRulesDir, testHome;

  before(() => {
    env = setupTestHome();
    testHome = env.tmpDir;

    // Clear cache and require the module with the new HOME
    rulesInstaller = freshRequire("../scripts/rules-installer", ["../scripts/platforms"]);

    testRulesDir = createTempDir();

    // Create test rules
    fs.writeFileSync(path.join(testRulesDir, "alpha.md"), "Alpha rule content");
    fs.writeFileSync(path.join(testRulesDir, "beta.md"), "Beta rule content");
    fs.writeFileSync(path.join(testRulesDir, "not-a-rule.txt"), "Ignore me");
    fs.writeFileSync(path.join(testRulesDir, "README"), "Also ignore");
  });

  after(() => {
    if (testRulesDir) cleanTempDir(testRulesDir);
    if (env) env.cleanup();
  });

  // --- Constants ---

  describe("Constants", () => {
    it("should export REPO_RULES_DIR", () => {
      assert.ok(rulesInstaller.REPO_RULES_DIR);
      assert.ok(rulesInstaller.REPO_RULES_DIR.includes(".agentools-cache"));
    });

    it("should export MANAGED_HEADER", () => {
      assert.ok(rulesInstaller.MANAGED_HEADER);
      assert.ok(rulesInstaller.MANAGED_HEADER.includes("agentools"));
    });

    it("should export SECTION_SEPARATOR", () => {
      assert.ok(rulesInstaller.SECTION_SEPARATOR);
      assert.ok(rulesInstaller.SECTION_SEPARATOR.includes("---"));
    });
  });

  // --- getGlobalRuleFiles ---

  describe("getGlobalRuleFiles", () => {
    it("should return sorted .md files only", () => {
      const files = rulesInstaller.getGlobalRuleFiles(testRulesDir);
      assert.strictEqual(files.length, 2);
      assert.ok(files[0].endsWith("alpha.md"), "First file should be alpha.md (sorted)");
      assert.ok(files[1].endsWith("beta.md"), "Second file should be beta.md (sorted)");
    });

    it("should skip non-.md files", () => {
      const files = rulesInstaller.getGlobalRuleFiles(testRulesDir);
      const basenames = files.map((f) => path.basename(f));
      assert.ok(!basenames.includes("not-a-rule.txt"), "Should not include .txt");
      assert.ok(!basenames.includes("README"), "Should not include files without .md");
    });

    it("should return empty array if directory does not exist", () => {
      const files = rulesInstaller.getGlobalRuleFiles("/nonexistent/path");
      assert.deepStrictEqual(files, []);
    });

    it("should return empty array for empty directory", () => {
      const emptyDir = createTempDir();
      const files = rulesInstaller.getGlobalRuleFiles(emptyDir);
      assert.deepStrictEqual(files, []);
      cleanTempDir(emptyDir);
    });
  });

  // --- mergeRuleFiles ---

  describe("mergeRuleFiles", () => {
    it("should return empty string for no files", () => {
      assert.strictEqual(rulesInstaller.mergeRuleFiles([]), "");
    });

    it("should merge files with managed header and separator", () => {
      const files = [
        path.join(testRulesDir, "alpha.md"),
        path.join(testRulesDir, "beta.md"),
      ];
      const merged = rulesInstaller.mergeRuleFiles(files);
      assert.ok(merged.startsWith(rulesInstaller.MANAGED_HEADER), "Should start with header");
      assert.ok(merged.includes("Alpha rule content"), "Should contain first file content");
      assert.ok(merged.includes("Beta rule content"), "Should contain second file content");
      assert.ok(merged.includes("---"), "Should have separator between files");
    });

    it("should trim whitespace from each file", () => {
      const tmpDir = createTempDir();
      fs.writeFileSync(path.join(tmpDir, "padded.md"), "  \n  Padded content  \n  ");
      const files = [path.join(tmpDir, "padded.md")];
      const merged = rulesInstaller.mergeRuleFiles(files);
      assert.ok(merged.includes("Padded content"), "Content should be trimmed");
      assert.ok(!merged.includes("  \n  Padded"), "Leading whitespace should be trimmed");
      cleanTempDir(tmpDir);
    });

    it("should handle single file without separator", () => {
      const files = [path.join(testRulesDir, "alpha.md")];
      const merged = rulesInstaller.mergeRuleFiles(files);
      const parts = merged.replace(rulesInstaller.MANAGED_HEADER, "").split("---");
      // Single file: no separator should appear between content blocks
      assert.strictEqual(parts.length, 1, "Single file should not have separator");
    });
  });

  // --- installRulesToFile ---

  describe("installRulesToFile", () => {
    it("should write merged content to new file", () => {
      const dest = path.join(testHome, "new-rules.md");
      const platform = { rulesPath: dest };
      const content = rulesInstaller.MANAGED_HEADER + "test content";

      const result = rulesInstaller.installRulesToFile(platform, content, false);
      assert.strictEqual(result.installed, true);
      assert.strictEqual(fs.readFileSync(dest, "utf-8"), content);
    });

    it("should create parent directories if they do not exist", () => {
      const dest = path.join(testHome, "deep", "nested", "dir", "rules.md");
      const platform = { rulesPath: dest };
      const content = rulesInstaller.MANAGED_HEADER + "nested content";

      const result = rulesInstaller.installRulesToFile(platform, content, false);
      assert.strictEqual(result.installed, true);
      assert.ok(fs.existsSync(dest));
    });

    it("should skip existing unmanaged file without force", () => {
      const dest = path.join(testHome, "user-rules.md");
      fs.writeFileSync(dest, "My custom rules");
      const platform = { rulesPath: dest };

      const result = rulesInstaller.installRulesToFile(platform, "new content", false);
      assert.strictEqual(result.installed, false);
      assert.ok(result.reason.includes("not managed"));
      assert.strictEqual(fs.readFileSync(dest, "utf-8"), "My custom rules");
    });

    it("should overwrite unmanaged file with force=true", () => {
      const dest = path.join(testHome, "force-overwrite.md");
      fs.writeFileSync(dest, "user content");
      const platform = { rulesPath: dest };
      const newContent = rulesInstaller.MANAGED_HEADER + "forced content";

      const result = rulesInstaller.installRulesToFile(platform, newContent, true);
      assert.strictEqual(result.installed, true);
      assert.strictEqual(fs.readFileSync(dest, "utf-8"), newContent);
    });

    it("should overwrite managed file even without force", () => {
      const dest = path.join(testHome, "managed-update.md");
      fs.writeFileSync(dest, rulesInstaller.MANAGED_HEADER + "old content");
      const platform = { rulesPath: dest };
      const newContent = rulesInstaller.MANAGED_HEADER + "new content";

      const result = rulesInstaller.installRulesToFile(platform, newContent, false);
      assert.strictEqual(result.installed, true);
      assert.strictEqual(fs.readFileSync(dest, "utf-8"), newContent);
    });

    it("should skip write when managed file content is identical", () => {
      const dest = path.join(testHome, "identical.md");
      const content = rulesInstaller.MANAGED_HEADER + "same content";
      fs.writeFileSync(dest, content);
      const platform = { rulesPath: dest };

      const result = rulesInstaller.installRulesToFile(platform, content, false);
      assert.strictEqual(result.installed, true);
      assert.ok(result.reason && result.reason.includes("up to date"));
    });

    it("should return installed:false when rulesPath is null", () => {
      const platform = { rulesPath: null };
      const result = rulesInstaller.installRulesToFile(platform, "content", false);
      assert.strictEqual(result.installed, false);
      assert.ok(result.reason.includes("No rulesPath"));
    });
  });

  // --- installRulesToFolder ---

  describe("installRulesToFolder", () => {
    it("should create rules folder if not exists", () => {
      const destFolder = path.join(testHome, "auto-create-folder");
      const platform = { rulesPath: destFolder };
      const files = [path.join(testRulesDir, "alpha.md")];

      rulesInstaller.installRulesToFolder(platform, files, false);
      assert.ok(fs.existsSync(destFolder), "Should create destination folder");
    });

    it("should copy each rule file preserving filename", () => {
      const destFolder = path.join(testHome, "copy-folder");
      const platform = { rulesPath: destFolder };
      const files = [
        path.join(testRulesDir, "alpha.md"),
        path.join(testRulesDir, "beta.md"),
      ];

      const result = rulesInstaller.installRulesToFolder(platform, files, false);
      assert.strictEqual(result.installed, true);
      assert.strictEqual(result.count, 2);
      assert.strictEqual(result.skipped, 0);
      assert.ok(fs.existsSync(path.join(destFolder, "alpha.md")));
      assert.ok(fs.existsSync(path.join(destFolder, "beta.md")));
      assert.strictEqual(
        fs.readFileSync(path.join(destFolder, "alpha.md"), "utf-8"),
        "Alpha rule content"
      );
    });

    it("should skip files with identical content", () => {
      const destFolder = path.join(testHome, "skip-identical-folder");
      fs.mkdirSync(destFolder, { recursive: true });
      fs.writeFileSync(path.join(destFolder, "alpha.md"), "Alpha rule content"); // same content

      const platform = { rulesPath: destFolder };
      const files = [path.join(testRulesDir, "alpha.md")];

      const result = rulesInstaller.installRulesToFolder(platform, files, false);
      assert.strictEqual(result.installed, false);
      assert.strictEqual(result.skipped, 1);
      assert.strictEqual(result.count, 0);
    });

    it("should overwrite files when content has changed", () => {
      const destFolder = path.join(testHome, "update-changed-folder");
      fs.mkdirSync(destFolder, { recursive: true });
      fs.writeFileSync(path.join(destFolder, "alpha.md"), "OLD content"); // different content

      const platform = { rulesPath: destFolder };
      const files = [path.join(testRulesDir, "alpha.md")];

      const result = rulesInstaller.installRulesToFolder(platform, files, false);
      assert.strictEqual(result.installed, true);
      assert.strictEqual(result.count, 1);
      assert.strictEqual(
        fs.readFileSync(path.join(destFolder, "alpha.md"), "utf-8"),
        "Alpha rule content"
      );
    });

    it("should return installed:false and count:0 when rulesPath is null", () => {
      const platform = { rulesPath: null };
      const result = rulesInstaller.installRulesToFolder(platform, [], false);
      assert.strictEqual(result.installed, false);
      assert.strictEqual(result.count, 0);
    });
  });
});
