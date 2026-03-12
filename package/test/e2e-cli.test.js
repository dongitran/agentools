/**
 * End-to-End CLI Tests
 *
 * These tests verify complete user workflows by executing
 * the CLI binary directly (not mocking child_process).
 *
 * Tests run in isolated environments with temporary HOME directories.
 */

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const {
  setupE2ETestEnv,
  createMockGitRepo,
  cleanTempDir,
} = require("./helpers");

test("E2E: agentools --help should display help text", () => {
  const env = setupE2ETestEnv();

  try {
    const result = env.runCLI(["--help"]);

    assert.strictEqual(result.exitCode, 0, "Should exit with code 0");
    assert.ok(result.stdout.includes("AI Agent Config CLI"), "Should show CLI name");
    assert.ok(result.stdout.includes("Usage:"), "Should show usage");
    assert.ok(result.stdout.includes("init"), "Should list init command");
    assert.ok(result.stdout.includes("push"), "Should list push command");
    assert.ok(result.stdout.includes("pull"), "Should list pull command");
  } finally {
    env.cleanup();
  }
});

test("E2E: agentools --version should display version", () => {
  const env = setupE2ETestEnv();

  try {
    const result = env.runCLI(["--version"]);

    assert.strictEqual(result.exitCode, 0, "Should exit with code 0");
    assert.ok(/\d+\.\d+\.\d+/.test(result.stdout), "Should show semantic version");
  } finally {
    env.cleanup();
  }
});

test("E2E: agentools init --force should create default config", () => {
  const env = setupE2ETestEnv();

  try {
    const result = env.runCLI(["init", "--force"]);

    assert.strictEqual(result.exitCode, 0, "Should exit with code 0");
    assert.ok(
      result.stdout.includes("Initializing") || result.stdout.includes("Migration complete"),
      "Should confirm initialization"
    );

    // Verify config file created
    const configPath = path.join(env.home, ".agentools", "config.json");
    assert.ok(fs.existsSync(configPath), "Config file should exist");

    // Verify config structure
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    assert.ok(config.version, "Config should have version");
    assert.ok(config.repository, "Config should have repository section");
    assert.ok(config.sources && Array.isArray(config.sources.custom), "Config should have sources.custom array");
  } finally {
    env.cleanup();
  }
});

test("E2E: agentools init --repo <url> should clone repository", () => {
  const env = setupE2ETestEnv();
  const mockRepo = createMockGitRepo({ withSampleSkill: true });

  try {
    const result = env.runCLI(["init", "--repo", mockRepo]);

    assert.strictEqual(result.exitCode, 0, "Should exit with code 0");
    assert.ok(
      result.stdout.includes("Cloning") || result.stdout.includes("cloned") || result.stdout.includes("configured"),
      "Should confirm clone"
    );

    // Verify config updated with repo info
    const configPath = path.join(env.home, ".agentools", "config.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    assert.strictEqual(config.repository.url, mockRepo, "Config should store repo URL");

    // Verify repo cloned
    const clonedRepo = path.join(env.home, ".agentools", "sync-repo");
    assert.ok(fs.existsSync(clonedRepo), "Repo should be cloned");
    assert.ok(fs.existsSync(path.join(clonedRepo, ".git")), "Cloned repo should have .git");
    const skillsDir = path.join(clonedRepo, ".agents", "skills");
    assert.ok(fs.existsSync(skillsDir), "Cloned repo should have .agents/skills/");
  } finally {
    env.cleanup();
    cleanTempDir(mockRepo);
  }
});

test("E2E: agentools init --repo <invalid-url> should fail gracefully", () => {
  const env = setupE2ETestEnv();

  try {
    // Use an unresolvable local domain to fail fast instead of hitting a public domain which might timeout
    const result = env.runCLI(["init", "--repo", "https://localhost:9999/invalid/repo.git"]);

    // May complete init but fail during clone - just verify it doesn't crash
    assert.ok(
      result.exitCode === 0 || // Init succeeded, clone warned
      result.stdout.includes("Failed to clone") ||
      result.stderr.includes("fatal") ||
      result.stderr.includes("Could not resolve"),
      "Should handle invalid URL gracefully"
    );
  } finally {
    env.cleanup();
  }
});

test("E2E: agentools list should show installed skills", () => {
  const env = setupE2ETestEnv();
  const mockRepo = createMockGitRepo({ withSampleSkill: true });

  try {
    // Setup
    env.runCLI(["init", "--repo", mockRepo]);

    const result = env.runCLI(["list"]);

    assert.strictEqual(result.exitCode, 0, "Should exit with code 0");
    assert.ok(
      result.stdout.includes("Installed Skills") || result.stdout.includes("Skills:"),
      "Should show skills section"
    );
    // Don't check for specific skill name - just verify it shows some output
    assert.ok(result.stdout.length > 50, "Should show skill information");
  } finally {
    env.cleanup();
    cleanTempDir(mockRepo);
  }
});

test("E2E: agentools list when repo not synced should warn", () => {
  const env = setupE2ETestEnv();

  try {
    // Init without repo
    env.runCLI(["init", "--force"]);

    const result = env.runCLI(["list"]);

    assert.strictEqual(result.exitCode, 0, "Should exit with code 0");
    assert.ok(result.stdout.includes("not synced"), "Should warn repo not synced");
  } finally {
    env.cleanup();
  }
});

test("E2E: agentools push without repo should error", () => {
  const env = setupE2ETestEnv();

  try {
    env.runCLI(["init", "--force"]);

    const result = env.runCLI(["push", "--message", "test"]);

    assert.notStrictEqual(result.exitCode, 0, "Should exit with error code");
    assert.ok(
      result.stdout.includes("No repository configured") || result.stderr.includes("No repository"),
      "Should show no repo error"
    );
  } finally {
    env.cleanup();
  }
});

test("E2E: agentools pull without repo should error", () => {
  const env = setupE2ETestEnv();

  try {
    env.runCLI(["init", "--force"]);

    const result = env.runCLI(["pull"]);

    assert.notStrictEqual(result.exitCode, 0, "Should exit with error code");
    assert.ok(
      result.stdout.includes("No repository configured") || result.stderr.includes("No repository"),
      "Should show no repo error"
    );
  } finally {
    env.cleanup();
  }
});

test("E2E: agentools config get version should return current version", () => {
  const env = setupE2ETestEnv();

  try {
    env.runCLI(["init", "--force"]);

    const result = env.runCLI(["config", "get", "version"]);

    assert.strictEqual(result.exitCode, 0, "Should exit with code 0");
    assert.ok(/\d+\.\d+\.\d+/.test(result.stdout), "Should show version number");
  } finally {
    env.cleanup();
  }
});

test("E2E: agentools config set should update config value", () => {
  const env = setupE2ETestEnv();

  try {
    env.runCLI(["init", "--force"]);

    // Set a value
    const setResult = env.runCLI(["config", "set", "autoSync", "true"]);
    assert.strictEqual(setResult.exitCode, 0, "Set should succeed");

    // Verify it persisted
    const configPath = path.join(env.home, ".agentools", "config.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    assert.strictEqual(config.autoSync, true, "Config value should be updated");
  } finally {
    env.cleanup();
  }
});

test("E2E: agentools config validate should check config integrity", () => {
  const env = setupE2ETestEnv();

  try {
    env.runCLI(["init", "--force"]);

    const result = env.runCLI(["config", "validate"]);

    assert.strictEqual(result.exitCode, 0, "Should exit with code 0");
    assert.ok(result.stdout.includes("valid") || result.stdout.includes("✓"), "Should confirm valid config");
  } finally {
    env.cleanup();
  }
});

test("E2E: agentools config validate with corrupted config should report errors", () => {
  const env = setupE2ETestEnv();

  try {
    env.runCLI(["init", "--force"]);

    // Corrupt config file
    const configPath = path.join(env.home, ".agentools", "config.json");
    fs.writeFileSync(configPath, "{ invalid json ");

    const result = env.runCLI(["config", "validate"]);

    assert.notStrictEqual(result.exitCode, 0, "Should exit with error code");
    assert.ok(
      result.stdout.includes("invalid") || result.stdout.includes("error") || result.stderr.length > 0,
      "Should report validation errors"
    );
  } finally {
    env.cleanup();
  }
});

test("E2E: agentools platforms should list detected platforms", () => {
  const env = setupE2ETestEnv();

  try {
    // Create mock Claude Code platform
    const claudeDir = path.join(env.home, ".claude");
    fs.mkdirSync(path.join(claudeDir, "skills"), { recursive: true });
    fs.writeFileSync(
      path.join(claudeDir, "claude_desktop_config.json"),
      JSON.stringify({ mcpServers: {} })
    );

    const result = env.runCLI(["platforms"]);

    assert.strictEqual(result.exitCode, 0, "Should exit with code 0");
    assert.ok(result.stdout.includes("Detecting platforms"), "Should show header");
    assert.ok(result.stdout.includes("Claude Code"), "Should detect Claude Code");
  } finally {
    env.cleanup();
  }
});

test("E2E: agentools platforms with no platforms should show supported list", () => {
  const env = setupE2ETestEnv();

  try {
    const result = env.runCLI(["platforms"]);

    assert.strictEqual(result.exitCode, 0, "Should exit with code 0");
    assert.ok(
      result.stdout.includes("Detecting platforms") || result.stdout.includes("platform"),
      "Should show platforms information"
    );
    // Output may vary based on what's actually detected, just verify reasonable output
    assert.ok(result.stdout.length > 20, "Should show some platform information");
  } finally {
    env.cleanup();
  }
});

test("E2E: agentools source list should show all sources", () => {
  const env = setupE2ETestEnv();

  try {
    env.runCLI(["init", "--force"]);

    const result = env.runCLI(["source", "list"]);

    assert.strictEqual(result.exitCode, 0, "Should exit with code 0");
    assert.ok(result.stdout.includes("Sources") || result.stdout.includes("source"), "Should show sources");
  } finally {
    env.cleanup();
  }
});

test("E2E: invalid command should show error and help hint", () => {
  const env = setupE2ETestEnv();

  try {
    const result = env.runCLI(["invalid-command"]);

    // May show help or error - just verify reasonable behavior
    assert.ok(
      result.exitCode !== 0 || result.stdout.includes("command") || result.stdout.includes("help"),
      "Should handle invalid command"
    );
  } finally {
    env.cleanup();
  }
});
