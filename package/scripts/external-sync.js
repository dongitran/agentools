/**
 * External Skills Sync Module
 * Automatically sync skills from external repositories
 * v2.0: Now reads from user config at ~/.agentools/config.json
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const configManager = require("./config-manager");

const CACHE_DIR = path.join(require("os").homedir(), ".agentools-external-cache");
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const REPO_EXTERNAL_CONFIG = path.join(REPO_ROOT, ".agents", "external-skills.json");
const REPO_EXTERNAL_TARGET_DIR = path.join(REPO_ROOT, ".agents", "skills");
const REPO_EXTERNAL_AGENTS_DIR = path.join(REPO_ROOT, ".agents", "agents");

/**
 * Validate that a path does not escape its intended base directory
 */
function getSafePath(baseDir, userInput) {
  const resolvedPath = path.resolve(baseDir, userInput);
  const safeBase = path.resolve(baseDir) + path.sep;
  if (!resolvedPath.startsWith(safeBase) && resolvedPath !== path.resolve(baseDir)) {
    throw new Error(`Path Traversal attempt detected: ${userInput}`);
  }
  return resolvedPath;
}

/**
 * Load repository-maintained external sources for CI/repo maintenance.
 */
function loadRepositoryConfig() {
  if (!fs.existsSync(REPO_EXTERNAL_CONFIG)) {
    return null;
  }

  const data = JSON.parse(fs.readFileSync(REPO_EXTERNAL_CONFIG, "utf-8"));
  if (!Array.isArray(data.sources)) {
    throw new Error(`Invalid external skills config: ${REPO_EXTERNAL_CONFIG}`);
  }

  return {
    sources: data.sources.filter((source) => source.enabled !== false),
    targetDir: REPO_EXTERNAL_TARGET_DIR,
    agentsDir: REPO_EXTERNAL_AGENTS_DIR,
  };
}

/**
 * Load external skills configuration from user config
 */
function loadConfig() {
  try {
    const repositoryConfig = loadRepositoryConfig();
    if (!configManager.configExists() && repositoryConfig) {
      return repositoryConfig;
    }

    // Load sources from user config
    const sources = configManager.getAllSources();
    const config = configManager.loadConfig();

    // Target directory is the user's configured repository
    const targetDir = config.repository && config.repository.local
      ? path.join(config.repository.local, ".agents", "skills")
      : path.join(require("os").homedir(), ".agentools", "skills");

    const agentsDir = config.repository && config.repository.local
      ? path.join(config.repository.local, ".agents", "agents")
      : path.join(require("os").homedir(), ".agentools", "agents");

    return { sources, targetDir, agentsDir };
  } catch (error) {
    console.error("⚠️  Failed to load user config:", error.message);
    console.log("💡 Run 'agentools init' to create config");
    throw error;
  }
}

/**
 * Clone or update a repository
 */
function syncRepo(source) {
  const repoDir = path.join(CACHE_DIR, source.name);

  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
  } catch (err) {
    console.error(`   Failed to create cache directory: ${err.message}`);
    return false;
  }

  try {
    if (fs.existsSync(repoDir)) {
      console.log(`   Updating ${source.name}...`);
      const fetchResult = spawnSync("git", ["-C", repoDir, "fetch", "origin"], { stdio: "pipe" });
      if (fetchResult.error || fetchResult.status !== 0) {
        throw new Error(`git fetch failed: ${fetchResult.stderr?.toString() || fetchResult.error?.message}`);
      }
      const resetResult = spawnSync("git", ["-C", repoDir, "reset", "--hard", `origin/${source.branch}`], { stdio: "pipe" });
      if (resetResult.error) {
        throw new Error(`git reset failed to spawn: ${resetResult.error.message}`);
      }
      if (resetResult.status !== 0) {
        throw new Error(resetResult.stderr?.toString() || "git reset failed");
      }
    } else {
      console.log(`   Cloning ${source.name}...`);
      const cloneResult = spawnSync("git", ["clone", "--branch", source.branch, source.repo, repoDir], {
        stdio: "pipe",
      });
      if (cloneResult.error) {
        try { fs.rmSync(repoDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); } catch (e) {}
        throw new Error(`git clone failed to spawn: ${cloneResult.error.message}`);
      }
      if (cloneResult.status !== 0) {
        try { fs.rmSync(repoDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); } catch (e) {}
        throw new Error(cloneResult.stderr?.toString() || "git clone failed");
      }
    }
    return true;
  } catch (error) {
    console.error(`   Failed to sync ${source.name}: ${error.message}`);
    return false;
  }
}

/**
 * Copy a skill from cache to target directory
 */
function copySkill(sourcePath, targetPath, force = false, excludePaths = []) {
  if (!fs.existsSync(sourcePath)) {
    return { copied: false, reason: "source not found" };
  }

  if (fs.existsSync(targetPath) && !force) {
    return { copied: false, reason: "already exists (use --force to overwrite)" };
  }

  // Remove existing directory if force
  if (fs.existsSync(targetPath) && force) {
    try {
      fs.rmSync(targetPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    } catch (error) {
      return { copied: false, reason: `failed to remove existing: ${error.message}` };
    }
  }

  // Create target directory
  fs.mkdirSync(targetPath, { recursive: true });

  // Copy all files recursively, excluding specified paths
  const excludeSet = new Set(excludePaths);
  copyDirRecursive(sourcePath, targetPath, excludeSet);

  return { copied: true };
}

/**
 * Recursively copy directory
 */
function copyDirRecursive(src, dest, excludeSet) {
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    // Check if this entry should be excluded (including hardcoded .git exclusion)
    if (entry.name === ".git" || excludeSet.has(entry.name)) {
      continue;
    }

    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
      }
      copyDirRecursive(srcPath, destPath, excludeSet);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Sync all external skills
 */
function syncAll(options = {}) {
  const { source = null, skill = null } = options;

  console.log("\n🔄 Syncing external skills...\n");

  const config = loadConfig();
  const targetDir = config.targetDir;
  const agentsDir = config.agentsDir;
  let sources = config.sources;

  // Filter by source if specified
  if (source) {
    sources = sources.filter((s) => s.name === source);
    if (sources.length === 0) {
      throw new Error(`Source "${source}" not found in config`);
    }
  }

  const results = {
    synced: 0,
    copied: 0,
    skipped: 0,
    failed: 0,
    details: [],
  };

  for (const src of sources) {
    console.log(`📦 Source: ${src.name}`);

    // Sync repository
    const synced = syncRepo(src);
    if (!synced) {
      results.failed++;
      continue;
    }
    results.synced++;

    const repoDir = path.join(CACHE_DIR, src.name);
    let skills = src.skills || [];
    let agents = src.agents || [];

    if (skill) {
      skills = skills.filter((s) => s.name === skill);
      agents = agents.filter((a) => a.name === skill);
      if (skills.length === 0 && agents.length === 0) {
        console.log(`   ⚠️  Skill/Agent "${skill}" not found in ${src.name}`);
        continue;
      }
    }

    // Copy each skill
    for (const skillDef of skills) {
      if (!skillDef.name || !skillDef.path) continue;
      
      try {
        const safeName = path.basename(skillDef.name);
        if (!safeName || safeName === "." || safeName === "..") continue;

        const sourcePath = getSafePath(repoDir, skillDef.path);
        const targetPath = getSafePath(targetDir, safeName);
        const excludePaths = skillDef.excludePaths || [];

        const result = copySkill(sourcePath, targetPath, true, excludePaths);

        if (result.copied) {
          console.log(`   ✓ ${skillDef.name}`);
          results.copied++;
        } else {
          console.log(`   ⊗ ${skillDef.name} (${result.reason})`);
          results.skipped++;
        }
      } catch (error) {
        console.error(`   ⊗ Skill: ${skillDef.name} (Security Error: ${error.message})`);
        results.failed++;
      }
    }

    // Sync agents if they exist
    if (agents.length > 0) {
      console.log(`   -- Syncing agents --`);
    }
    for (const agentDef of agents) {
      if (!agentDef.name || !agentDef.path) continue;

      try {
        const safeName = path.basename(agentDef.name);
        if (!safeName || safeName === "." || safeName === "..") continue;

        const sourcePath = getSafePath(repoDir, agentDef.path);
        const targetPath = getSafePath(agentsDir, safeName);
        const excludePaths = agentDef.excludePaths || [];

        const result = copySkill(sourcePath, targetPath, true, excludePaths);

        if (result.copied) {
          console.log(`   ✓ Agent: ${agentDef.name}`);
          results.copied++;
        } else {
          console.log(`   ⊗ Agent: ${agentDef.name} (${result.reason})`);
          results.skipped++;
        }
      } catch (error) {
        console.error(`   ⊗ Agent: ${agentDef.name} (Security Error: ${error.message})`);
        results.failed++;
      }
    }

    console.log("");
  }

  return results;
}

/**
 * List available external skills
 */
function list() {
  console.log("\n📋 Available External Skills\n");

  const config = loadConfig();
  const targetDir = config.targetDir;

  for (const source of config.sources) {
    console.log(`Source: ${source.name}`);
    console.log(`  Repository: ${source.repo}`);
    console.log(`  License: ${source.license}`);
    console.log(`  Skills:`);

    for (const skill of source.skills || []) {
      const targetPath = path.join(targetDir, skill.name);
      const installed = fs.existsSync(targetPath) ? "✓ installed" : "";
      console.log(`    • ${skill.name} ${installed}`);
    }

    if (source.agents && source.agents.length > 0) {
      console.log(`  Agents:`);
      for (const agent of source.agents) {
        const targetPath = path.join(config.agentsDir, agent.name);
        const installed = fs.existsSync(targetPath) ? "✓ installed" : "";
        console.log(`    • ${agent.name} ${installed}`);
      }
    }

    console.log("");
  }
}

module.exports = {
  syncAll,
  list,
  loadConfig,
};
