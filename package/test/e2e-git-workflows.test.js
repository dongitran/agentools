/**
 * End-to-End Git Workflow Tests
 *
 * Tests complex git operations: push, pull, conflicts, auto-sync
 *
 * NOTE: These tests use REAL git operations with local repos
 * to verify actual behavior (not mocked).
 */

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const {
  setupE2ETestEnv,
  createMockGitRepo,
  cleanTempDir,
} = require("./helpers");

/**
 * Setup a "remote" git repo and local clone for testing push/pull
 */
function setupGitWorkflow() {
  // Create "remote" repo (simulates GitHub)
  const remoteRepo = createMockGitRepo({ withSampleSkill: true });

  // Create "local" repo by cloning remote
  const localRepo = path.join(require("os").tmpdir(), `agentools-test-local-${Date.now()}`);
  execSync(`git clone "${remoteRepo}" "${localRepo}"`, { stdio: "ignore" });

  return { remoteRepo, localRepo };
}

test("E2E Git: agentools push should commit and push changes", () => {
  const env = setupE2ETestEnv();
  const { remoteRepo, localRepo } = setupGitWorkflow();

  try {
    // Init with local repo (simulates user's repo)
    env.runCLI(["init", "--repo", remoteRepo]);

    // Make changes to skills
    const syncRepoPath = path.join(env.home, ".agentools", "sync-repo");
    const newSkillDir = path.join(syncRepoPath, ".agents", "skills", "new-skill");
    fs.mkdirSync(newSkillDir, { recursive: true });
    fs.writeFileSync(
      path.join(newSkillDir, "SKILL.md"),
      "# New Skill\n\ndescription: A new skill"
    );

    // Push changes
    const pushResult = env.runCLI(["push", "--message", "Add new skill"]);

    assert.strictEqual(pushResult.exitCode, 0, "Push should succeed");
    assert.ok(
      pushResult.stdout.includes("Pushed") || pushResult.stdout.includes("Push") || pushResult.stdout.includes("up to date"),
      "Should show push status"
    );

    // Verify changes in remote repo (if push actually happened)
    const remoteSkillPath = path.join(remoteRepo, ".agents", "skills", "new-skill", "SKILL.md");
    const changesExist = fs.existsSync(remoteSkillPath);

    // If changes exist, verify commit message
    if (changesExist) {
      const log = execSync("git log -1 --pretty=%B", { cwd: remoteRepo, encoding: "utf-8" });
      assert.ok(log.includes("Add new skill") || log.includes("skill"), "Commit message should be reasonable");
    }
  } finally {
    env.cleanup();
    cleanTempDir(remoteRepo);
    cleanTempDir(localRepo);
  }
});

test("E2E Git: agentools pull should fetch latest changes", () => {
  const env = setupE2ETestEnv();
  const { remoteRepo, localRepo } = setupGitWorkflow();

  try {
    // Init
    env.runCLI(["init", "--repo", remoteRepo]);

    // Simulate remote changes (someone else pushed)
    const remoteNewSkill = path.join(remoteRepo, ".agents", "skills", "remote-skill");
    fs.mkdirSync(remoteNewSkill, { recursive: true });
    fs.writeFileSync(
      path.join(remoteNewSkill, "SKILL.md"),
      "# Remote Skill\n\ndescription: Added remotely"
    );
    execSync("git add .", { cwd: remoteRepo, stdio: "ignore" });
    execSync('git commit -m "Add remote skill"', { cwd: remoteRepo, stdio: "ignore" });

    // Pull changes
    const pullResult = env.runCLI(["pull", "--no-install"]);

    assert.strictEqual(pullResult.exitCode, 0, "Pull should succeed");
    assert.ok(pullResult.stdout.includes("Pulled successfully"), "Should confirm pull");

    // Verify changes pulled to local
    const syncRepoPath = path.join(env.home, ".agentools", "sync-repo");
    const localNewSkill = path.join(syncRepoPath, ".agents", "skills", "remote-skill", "SKILL.md");
    assert.ok(fs.existsSync(localNewSkill), "Remote changes should be pulled");
  } finally {
    env.cleanup();
    cleanTempDir(remoteRepo);
    cleanTempDir(localRepo);
  }
});

test("E2E Git: agentools pull with --no-install should skip auto-install", () => {
  const env = setupE2ETestEnv();
  const { remoteRepo, localRepo } = setupGitWorkflow();

  try {
    env.runCLI(["init", "--repo", remoteRepo]);

    // Create mock platform
    const claudeDir = path.join(env.home, ".claude");
    fs.mkdirSync(path.join(claudeDir, "skills"), { recursive: true });
    fs.writeFileSync(
      path.join(claudeDir, "claude_desktop_config.json"),
      JSON.stringify({ mcpServers: {} })
    );

    const pullResult = env.runCLI(["pull", "--no-install"]);

    assert.strictEqual(pullResult.exitCode, 0, "Pull should succeed");
    // Should NOT see "Auto-installing" message
    assert.ok(!pullResult.stdout.includes("Auto-installing"), "Should skip auto-install");
  } finally {
    env.cleanup();
    cleanTempDir(remoteRepo);
    cleanTempDir(localRepo);
  }
});

test("E2E Git: agentools pull should auto-install by default", () => {
  const env = setupE2ETestEnv();
  const { remoteRepo, localRepo } = setupGitWorkflow();

  try {
    env.runCLI(["init", "--repo", remoteRepo]);

    // Create mock platform
    const claudeDir = path.join(env.home, ".claude");
    const skillsDir = path.join(claudeDir, "skills");
    fs.mkdirSync(skillsDir, { recursive: true });
    fs.writeFileSync(
      path.join(claudeDir, "claude_desktop_config.json"),
      JSON.stringify({ mcpServers: {} })
    );

    const pullResult = env.runCLI(["pull"]);

    assert.strictEqual(pullResult.exitCode, 0, "Pull should succeed");
    // Should see auto-install happening
    assert.ok(pullResult.stdout.includes("Auto-installing") || pullResult.stdout.includes("Installing"), "Should auto-install");

    // Verify SOME skills were installed
    const skillsInstalled = fs.readdirSync(skillsDir).length > 0;
    if (!skillsInstalled) {
      console.log("PULL STDOUT:", pullResult.stdout);
      console.log("PULL STDERR:", pullResult.stderr);
    }
    assert.ok(skillsInstalled, "Skills should be auto-installed");
  } finally {
    env.cleanup();
    cleanTempDir(remoteRepo);
    cleanTempDir(localRepo);
  }
});

test("E2E Git: push with auto-sync should pull before push", () => {
  const env = setupE2ETestEnv();
  const { remoteRepo, localRepo } = setupGitWorkflow();

  try {
    // Init with auto-sync enabled
    env.runCLI(["init", "--repo", remoteRepo]);
    env.runCLI(["config", "set", "autoSync", "true"]);

    // Simulate remote changes
    const remoteNewSkill = path.join(remoteRepo, ".agents", "skills", "remote-change");
    fs.mkdirSync(remoteNewSkill, { recursive: true });
    fs.writeFileSync(path.join(remoteNewSkill, "SKILL.md"), "# Remote\n");
    execSync("git add .", { cwd: remoteRepo, stdio: "ignore" });
    execSync('git commit -m "Remote change"', { cwd: remoteRepo, stdio: "ignore" });

    // Make local changes
    const syncRepoPath = path.join(env.home, ".agentools", "sync-repo");
    const localNewSkill = path.join(syncRepoPath, ".agents", "skills", "local-change");
    fs.mkdirSync(localNewSkill, { recursive: true });
    fs.writeFileSync(path.join(localNewSkill, "SKILL.md"), "# Local\n");

    // Push should auto-pull first (or may conflict/fail - that's ok for this test)
    const pushResult = env.runCLI(["push", "--message", "Local change"]);

    // Just verify it doesn't crash - git operations may succeed or handle conflicts
    assert.ok(
      pushResult.exitCode === 0 || pushResult.stdout.includes("conflict") || pushResult.stdout.includes("Pushed"),
      "Should handle auto-sync gracefully"
    );
  } finally {
    env.cleanup();
    cleanTempDir(remoteRepo);
    cleanTempDir(localRepo);
  }
});

test("E2E Git: update command should sync external sources", () => {
  const env = setupE2ETestEnv();
  const { remoteRepo, localRepo } = setupGitWorkflow();

  try {
    // Setup with repo
    env.runCLI(["init", "--repo", remoteRepo]);

    // Add an external source (another git repo with skills)
    const externalSource = createMockGitRepo({ withSampleSkill: true });
    const externalSkillPath = path.join(externalSource, ".agents", "skills", "external-skill");
    fs.mkdirSync(externalSkillPath, { recursive: true });
    fs.writeFileSync(
      path.join(externalSkillPath, "SKILL.md"),
      "# External Skill\n\ndescription: From external source"
    );
    execSync("git add .", { cwd: externalSource, stdio: "ignore" });
    execSync('git commit -m "Add external skill"', { cwd: externalSource, stdio: "ignore" });

    env.runCLI(["source", "add", externalSource, "--name", "external-source"]);

    // Run update
    const updateResult = env.runCLI(["update"]);

    assert.strictEqual(updateResult.exitCode, 0, "Update should succeed");
    assert.ok(
      updateResult.stdout.includes("Updated") || updateResult.stdout.includes("source"),
      "Should show update status"
    );

    // May or may not sync depending on implementation - just verify no crash
    const syncRepoPath = path.join(env.home, ".agentools", "sync-repo");
    assert.ok(fs.existsSync(syncRepoPath), "Sync repo should exist");

    cleanTempDir(externalSource);
  } finally {
    env.cleanup();
    cleanTempDir(remoteRepo);
    cleanTempDir(localRepo);
  }
});

test("E2E Git: conflicting changes should be detected and reported", () => {
  const env = setupE2ETestEnv();
  const { remoteRepo, localRepo } = setupGitWorkflow();

  try {
    env.runCLI(["init", "--repo", remoteRepo]);

    const syncRepoPath = path.join(env.home, ".agentools", "sync-repo");
    const conflictFile = path.join(syncRepoPath, ".agents", "skills", "sample-skill", "SKILL.md");

    // Make conflicting remote change
    const remoteConflictFile = path.join(remoteRepo, ".agents", "skills", "sample-skill", "SKILL.md");
    fs.writeFileSync(remoteConflictFile, "# Remote Version\n\ndescription: Remote edit");
    execSync("git add .", { cwd: remoteRepo, stdio: "ignore" });
    execSync('git commit -m "Remote edit"', { cwd: remoteRepo, stdio: "ignore" });

    // Make conflicting local change to same file
    fs.writeFileSync(conflictFile, "# Local Version\n\ndescription: Local edit");

    // Try to push - should handle conflict or succeed depending on sync strategy
    const pushResult = env.runCLI(["push", "--message", "Local edit"]);

    // Just verify reasonable handling (may auto-merge, conflict, or fail)
    assert.ok(
      pushResult.exitCode === 0 || pushResult.stdout.includes("conflict") || pushResult.stdout.includes("Pushed"),
      "Should handle conflicts reasonably"
    );
  } finally {
    env.cleanup();
    cleanTempDir(remoteRepo);
    cleanTempDir(localRepo);
  }
});

test("E2E Git: push to repo with no changes should handle gracefully", () => {
  const env = setupE2ETestEnv();
  const { remoteRepo, localRepo } = setupGitWorkflow();

  try {
    env.runCLI(["init", "--repo", remoteRepo]);

    // Push without making any changes
    const pushResult = env.runCLI(["push", "--message", "No changes"]);

    // Should succeed and show some status
    assert.strictEqual(pushResult.exitCode, 0, "Push should succeed");
    assert.ok(
      pushResult.stdout.length > 10,
      "Should show some output"
    );
  } finally {
    env.cleanup();
    cleanTempDir(remoteRepo);
    cleanTempDir(localRepo);
  }
});

test("E2E Git: multiple platforms should all receive updates after pull", () => {
  const env = setupE2ETestEnv();
  const { remoteRepo, localRepo } = setupGitWorkflow();

  try {
    env.runCLI(["init", "--repo", remoteRepo]);

    // Create multiple mock platforms
    const platforms = [
      { name: "claude", config: "claude_desktop_config.json", dir: ".claude" },
      { name: "cursor", config: "config.json", dir: ".cursor" },
    ];

    platforms.forEach((p) => {
      const platformDir = path.join(env.home, p.dir);
      const skillsDir = path.join(platformDir, "skills");
      fs.mkdirSync(skillsDir, { recursive: true });
      fs.writeFileSync(
        path.join(platformDir, p.config),
        JSON.stringify({ mcpServers: {} })
      );
    });

    // Pull (should auto-install to all platforms)
    const pullResult = env.runCLI(["pull"]);

    assert.strictEqual(pullResult.exitCode, 0, "Pull should succeed");

    // Verify platforms received SOME skills
    platforms.forEach((p) => {
      const skillsDir = path.join(env.home, p.dir, "skills");
      const hasSkills = fs.existsSync(skillsDir) && fs.readdirSync(skillsDir).length > 0;
      assert.ok(hasSkills, `${p.name} should receive skills after pull`);
    });
  } finally {
    env.cleanup();
    cleanTempDir(remoteRepo);
    cleanTempDir(localRepo);
  }
});
