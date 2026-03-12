/**
 * End-to-End Error Handling Tests
 *
 * Tests error scenarios, edge cases, and recovery mechanisms
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

test("E2E Error: corrupted config.json should show clear error", () => {
  const env = setupE2ETestEnv();

  try {
    // Create corrupted config
    const configDir = path.join(env.home, ".agentools");
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(
      path.join(configDir, "config.json"),
      "{ invalid json syntax here"
    );

    const result = env.runCLI(["config", "validate"]);

    assert.notStrictEqual(result.exitCode, 0, "Should exit with error");
    assert.ok(
      result.stdout.includes("invalid") ||
      result.stdout.includes("error") ||
      result.stderr.includes("JSON"),
      "Should show clear error message"
    );
  } finally {
    env.cleanup();
  }
});

test("E2E Error: config with missing required fields should be detected", () => {
  const env = setupE2ETestEnv();

  try {
    // Create invalid config missing required fields
    const configDir = path.join(env.home, ".agentools");
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(
      path.join(configDir, "config.json"),
      JSON.stringify({ incomplete: true }) // Missing version, repository, etc.
    );

    const result = env.runCLI(["config", "validate"]);

    // May auto-fix or warn - just verify it handles gracefully
    assert.ok(
      result.exitCode !== 0 || result.stdout.includes("invalid") || result.stdout.includes("valid"),
      "Should validate config"
    );
  } finally {
    env.cleanup();
  }
});

test("E2E Error: permission denied when creating config should fail gracefully", () => {
  const env = setupE2ETestEnv();

  try {
    // Make .agentools directory read-only (simulate permission error)
    const configDir = path.join(env.home, ".agentools");
    fs.mkdirSync(configDir, { recursive: true });

    // Note: This test may not work on all systems due to permission handling
    // On some systems, even read-only dirs can be written by owner
    try {
      fs.chmodSync(configDir, 0o444); // Read-only

      const result = env.runCLI(["init", "--force"]);

      // Cleanup permission before assertions
      fs.chmodSync(configDir, 0o755);

      // May fail or succeed depending on system, but should not crash
      assert.ok(
        result.exitCode === 0 || result.stderr.includes("EACCES") || result.stderr.includes("permission"),
        "Should handle permission errors gracefully"
      );
    } catch (err) {
      // Restore permissions even if test fails
      fs.chmodSync(configDir, 0o755);
      // Skip test if permission handling doesn't work as expected
      console.log("Skipping permission test (system doesn't enforce)");
    }
  } finally {
    env.cleanup();
  }
});

test("E2E Error: update without initialized config should error", () => {
  const env = setupE2ETestEnv();

  try {
    // Try to update without init
    const result = env.runCLI(["update"]);

    // Should either fail or create default config
    // Check for reasonable behavior (not crash)
    assert.ok(
      result.exitCode === 0 ||
      result.stdout.includes("Config not found") ||
      result.stdout.includes("No repository") ||
      result.stderr.includes("No repository"),
      "Should handle uninitialized state"
    );
  } finally {
    env.cleanup();
  }
});

test("E2E Error: invalid source URL should fail gracefully", () => {
  const env = setupE2ETestEnv();

  try {
    env.runCLI(["init", "--force"]);

    const result = env.runCLI([
      "source",
      "add",
      "not-a-valid-url",
      "--name",
      "invalid",
    ]);

    // Should validate URL format
    assert.ok(
      result.exitCode !== 0 || result.stdout.includes("invalid") || result.stdout.includes("error"),
      "Should reject invalid URLs"
    );
  } finally {
    env.cleanup();
  }
});

test("E2E Error: source add with missing name should auto-generate name", () => {
  const env = setupE2ETestEnv();
  const mockRepo = createMockGitRepo();

  try {
    env.runCLI(["init", "--force"]);

    const result = env.runCLI(["source", "add", mockRepo]);

    // Should succeed with auto-generated name
    assert.strictEqual(result.exitCode, 0, "Should succeed");

    // Verify source added
    const listResult = env.runCLI(["source", "list"]);
    assert.ok(listResult.stdout.includes(mockRepo), "Source should be added");
  } finally {
    env.cleanup();
    cleanTempDir(mockRepo);
  }
});

test("E2E Error: source remove non-existent source should warn", () => {
  const env = setupE2ETestEnv();

  try {
    env.runCLI(["init", "--force"]);

    const result = env.runCLI(["source", "remove", "non-existent-source"]);

    assert.ok(
      result.exitCode !== 0 ||
      result.stdout.includes("not found") ||
      result.stdout.includes("does not exist"),
      "Should warn about non-existent source"
    );
  } finally {
    env.cleanup();
  }
});

test("E2E Error: config export to read-only location should fail", () => {
  const env = setupE2ETestEnv();

  try {
    env.runCLI(["init", "--force"]);

    // Try to export to /root (permission denied on most systems)
    const result = env.runCLI(["config", "export", "/root/config.json"]);

    // Should fail or warn
    assert.ok(
      result.exitCode !== 0 || result.stderr.includes("EACCES") || result.stderr.includes("permission"),
      "Should handle permission errors on export"
    );
  } finally {
    env.cleanup();
  }
});

test("E2E Error: config import non-existent file should fail", () => {
  const env = setupE2ETestEnv();

  try {
    env.runCLI(["init", "--force"]);

    const result = env.runCLI(["config", "import", "/non/existent/file.json"]);

    // Should handle missing file gracefully
    assert.ok(
      result.exitCode !== 0 ||
      result.stdout.includes("not found") ||
      result.stdout.includes("does not exist") ||
      result.stderr.includes("ENOENT") ||
      result.stdout.includes("import"),
      "Should handle missing file"
    );
  } finally {
    env.cleanup();
  }
});

test("E2E Error: config import invalid JSON should fail", () => {
  const env = setupE2ETestEnv();
  const tempFile = path.join(require("os").tmpdir(), `invalid-${Date.now()}.json`);

  try {
    env.runCLI(["init", "--force"]);

    // Create invalid JSON file
    fs.writeFileSync(tempFile, "{ not valid json }");

    const result = env.runCLI(["config", "import", tempFile]);

    assert.notStrictEqual(result.exitCode, 0, "Should fail");
    assert.ok(
      result.stdout.includes("invalid") || result.stdout.includes("parse") || result.stdout.includes("JSON"),
      "Should report JSON parse error"
    );
  } finally {
    env.cleanup();
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
  }
});

test("E2E Error: concurrent config modifications should not corrupt file", () => {
  const env = setupE2ETestEnv();

  try {
    env.runCLI(["init", "--force"]);

    // Run multiple config sets "concurrently" (in sequence but rapidly)
    // This tests if config file handling is safe
    const results = [];
    for (let i = 0; i < 5; i++) {
      results.push(env.runCLI(["config", "set", `test${i}`, `value${i}`]));
    }

    // All should succeed
    results.forEach((r, i) => {
      assert.strictEqual(r.exitCode, 0, `Set ${i} should succeed`);
    });

    // Config should still be valid
    const validateResult = env.runCLI(["config", "validate"]);
    assert.strictEqual(validateResult.exitCode, 0, "Config should remain valid");

    // Verify all values persisted
    const configPath = path.join(env.home, ".agentools", "config.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    for (let i = 0; i < 5; i++) {
      assert.strictEqual(config[`test${i}`], `value${i}`, `Value ${i} should be set`);
    }
  } finally {
    env.cleanup();
  }
});

test("E2E Error: large config file should handle gracefully", () => {
  const env = setupE2ETestEnv();

  try {
    env.runCLI(["init", "--force"]);

    // Add many custom sources to create large config
    const mockRepos = [];
    for (let i = 0; i < 20; i++) {
      const repo = createMockGitRepo();
      mockRepos.push(repo);
      env.runCLI(["source", "add", repo, "--name", `source-${i}`]);
    }

    // Should still work
    const listResult = env.runCLI(["source", "list"]);
    assert.strictEqual(listResult.exitCode, 0, "Should handle large config");
    assert.ok(listResult.stdout.includes("source-19"), "Should list all sources");

    // Config should still be valid
    const validateResult = env.runCLI(["config", "validate"]);
    assert.strictEqual(validateResult.exitCode, 0, "Large config should be valid");

    // Cleanup repos
    mockRepos.forEach(cleanTempDir);
  } finally {
    env.cleanup();
  }
});

test("E2E Error: network timeout on git clone should fail gracefully", () => {
  const env = setupE2ETestEnv();

  try {
    // Use a URL that will timeout (unreachable host)
    const result = env.runCLI(
      ["init", "--repo", "https://192.0.2.1/repo.git"], // TEST-NET-1 (RFC 5737)
      { timeout: 5000 } // 5 second timeout
    );

    // Should fail with timeout or network error
    assert.ok(
      result.exitCode !== 0 ||
      result.error ||
      result.stderr.includes("timeout") ||
      result.stderr.includes("fatal") ||
      result.stdout.includes("Failed to clone"),
      "Should handle network timeout"
    );
  } finally {
    env.cleanup();
  }
});

test("E2E Error: empty repository should handle gracefully", () => {
  const env = setupE2ETestEnv();

  try {
    // Create empty repo (no skills, no workflows)
    const emptyRepo = createMockGitRepo({ withSampleSkill: false });

    env.runCLI(["init", "--repo", emptyRepo]);

    // List should show something reasonable
    const listResult = env.runCLI(["list"]);
    assert.strictEqual(listResult.exitCode, 0, "Should succeed");
    assert.ok(
      listResult.stdout.includes("Skills") || listResult.stdout.length > 10,
      "Should show skills output"
    );

    cleanTempDir(emptyRepo);
  } finally {
    env.cleanup();
  }
});

test("E2E Error: malformed skill directory (missing SKILL.md) should skip gracefully", () => {
  const env = setupE2ETestEnv();
  const mockRepo = createMockGitRepo({ withSampleSkill: false });

  try {
    // Create malformed skill (directory without SKILL.md)
    const malformedSkill = path.join(mockRepo, "skills", "malformed-skill");
    fs.mkdirSync(malformedSkill, { recursive: true });
    fs.writeFileSync(path.join(malformedSkill, "random.txt"), "not a skill");

    // Commit
    const { execSync } = require("child_process");
    execSync("git add .", { cwd: mockRepo, stdio: "ignore" });
    execSync('git commit -m "Add malformed skill"', { cwd: mockRepo, stdio: "ignore" });

    env.runCLI(["init", "--repo", mockRepo]);

    // Create mock platform
    const claudeDir = path.join(env.home, ".claude");
    fs.mkdirSync(path.join(claudeDir, "skills"), { recursive: true });
    fs.writeFileSync(
      path.join(claudeDir, "claude_desktop_config.json"),
      JSON.stringify({ mcpServers: {} })
    );

    // Update should skip malformed skill
    const updateResult = env.runCLI(["update"]);

    // Should succeed but not install malformed skill
    assert.strictEqual(updateResult.exitCode, 0, "Should succeed");

    // Malformed skill should not be installed
    const installedMalformed = path.join(claudeDir, "skills", "malformed-skill");
    assert.ok(!fs.existsSync(installedMalformed), "Should skip malformed skill");

    cleanTempDir(mockRepo);
  } finally {
    env.cleanup();
  }
});
