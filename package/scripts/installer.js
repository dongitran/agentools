/**
 * Installer module for AI Agent Config
 * Handles syncing from GitHub repo and copying skills to platform directories
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const platforms = require("./platforms");

const mcpInstaller = require("./mcp-installer");

const REPO_URL = "https://github.com/dongitran/agentools.git";
const CACHE_DIR = path.join(platforms.HOME, ".agentools-cache");
const REPO_SKILLS_DIR = path.join(CACHE_DIR, ".agents", "skills");
const REPO_WORKFLOWS_DIR = path.join(CACHE_DIR, ".agents", "workflows");
const PACKAGE_SKILLS_DIR = path.join(__dirname, "..", ".agents", "skills");

/**
 * Copy directory recursively
 */
function copyDir(src, dest, force = false) {
  if (!fs.existsSync(src)) {
    return { copied: 0, skipped: 0 };
  }

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  let copied = 0;
  let skipped = 0;

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      const result = copyDir(srcPath, destPath, force);
      copied += result.copied;
      skipped += result.skipped;
    } else {
      if (fs.existsSync(destPath) && !force) {
        skipped++;
      } else {
        fs.copyFileSync(srcPath, destPath);
        copied++;
      }
    }
  }

  return { copied, skipped };
}

/**
 * Sync repository from GitHub
 * @returns {boolean} Success status
 */
function syncRepo() {
  try {
    if (fs.existsSync(CACHE_DIR)) {
      console.log("   Updating cached repository...");
      execSync("git pull --quiet", { cwd: CACHE_DIR, stdio: "pipe" });
    } else {
      console.log("   Cloning repository...");
      execSync(`git clone --quiet "${REPO_URL}" "${CACHE_DIR}"`, { stdio: "pipe" });
    }
    return true;
  } catch (error) {
    console.error(`   Failed to sync: ${error.message}`);
    return false;
  }
}

/**
 * Check if repo is cached
 */
function isRepoCached() {
  return fs.existsSync(CACHE_DIR) && fs.existsSync(REPO_SKILLS_DIR);
}

/**
 * Get list of available skills
 * Merges package bundled skills + external repo cache
 */
function getAvailableSkills() {
  const skills = new Set();

  // Add package bundled skills first (.agents/skills/)
  if (fs.existsSync(PACKAGE_SKILLS_DIR)) {
    const packageSkills = fs.readdirSync(PACKAGE_SKILLS_DIR);
    packageSkills.forEach((name) => {
      const skillPath = path.join(PACKAGE_SKILLS_DIR, name);
      const skillFile = path.join(skillPath, "SKILL.md");
      if (fs.statSync(skillPath).isDirectory() && fs.existsSync(skillFile)) {
        skills.add(name);
      }
    });


  }

  // Merge with skills from external repo cache
  if (fs.existsSync(REPO_SKILLS_DIR)) {
    fs.readdirSync(REPO_SKILLS_DIR).forEach((name) => {
      const skillPath = path.join(REPO_SKILLS_DIR, name);
      const skillFile = path.join(skillPath, "SKILL.md");
      if (fs.statSync(skillPath).isDirectory() && fs.existsSync(skillFile)) {
        skills.add(name);
      }
    });
  }

  return Array.from(skills);
}

/**
 * Get list of available workflows from cached repo
 */
function getAvailableWorkflows() {
  if (!fs.existsSync(REPO_WORKFLOWS_DIR)) {
    return [];
  }

  return fs
    .readdirSync(REPO_WORKFLOWS_DIR)
    .filter((name) => name.endsWith(".md"))
    .map((name) => name.replace(".md", ""));
}

/**
 * Copy workflows as skills for Claude Code
 * Claude Code doesn't support workflows directory, so we convert them to skills
 */
function copyWorkflowsAsSkills(skillsPath, force = false) {
  const results = [];

  if (!fs.existsSync(REPO_WORKFLOWS_DIR)) {
    return results;
  }

  const workflowFiles = fs.readdirSync(REPO_WORKFLOWS_DIR).filter((f) => f.endsWith(".md"));

  for (const wfFile of workflowFiles) {
    const workflowName = wfFile.replace(".md", "");
    const srcPath = path.join(REPO_WORKFLOWS_DIR, wfFile);
    const destDir = path.join(skillsPath, workflowName);
    const destPath = path.join(destDir, "SKILL.md");

    // Create skill directory
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    if (fs.existsSync(destPath) && !force) {
      results.push({ name: workflowName, skipped: 1, copied: 0 });
    } else {
      fs.copyFileSync(srcPath, destPath);
      results.push({ name: workflowName, skipped: 0, copied: 1 });
    }
  }

  return results;
}

/**
 * Install skills and workflows to a specific platform
 */
function installToPlatform(platform, options = {}) {
  const { force = false, skill = null } = options;

  const skillsPath = platforms.ensureSkillsDir(platform);
  const workflowsPath = platforms.ensureWorkflowsDir(platform);

  const results = {
    platform: platform.name,
    skillsPath: skillsPath,
    workflowsPath: workflowsPath,
    skills: [],
    workflows: [],
    mcpServers: null,
  };

  // Install skills
  let skillsToInstall = getAvailableSkills();

  if (skill) {
    skillsToInstall = skillsToInstall.filter((s) => s === skill);
    if (skillsToInstall.length === 0) {
      throw new Error(`Skill "${skill}" not found in repository`);
    }
  }

  for (const skillName of skillsToInstall) {
    // Try package skills first, then repo cache
    let srcPath = path.join(PACKAGE_SKILLS_DIR, skillName);
    if (!fs.existsSync(srcPath)) {
      srcPath = path.join(REPO_SKILLS_DIR, skillName);
    }

    const destPath = path.join(skillsPath, skillName);
    const copyResult = copyDir(srcPath, destPath, force);
    results.skills.push({
      name: skillName,
      ...copyResult,
    });
  }

  // Handle workflows based on platform
  if (fs.existsSync(REPO_WORKFLOWS_DIR)) {
    // Claude Code: Copy workflows as skills (workflows → skills/<name>/SKILL.md)
    if (platform.name === "claude" && skillsPath) {
      const workflowResults = copyWorkflowsAsSkills(skillsPath, force);
      results.workflows = workflowResults;
    }
    // Other platforms (Antigravity): Copy workflows to workflows directory
    else if (workflowsPath) {
      const workflowFiles = fs.readdirSync(REPO_WORKFLOWS_DIR).filter((f) => f.endsWith(".md"));

      for (const wfFile of workflowFiles) {
        const srcPath = path.join(REPO_WORKFLOWS_DIR, wfFile);
        const destPath = path.join(workflowsPath, wfFile);

        if (fs.existsSync(destPath) && !force) {
          results.workflows.push({ name: wfFile.replace(".md", ""), skipped: 1, copied: 0 });
        } else {
          fs.copyFileSync(srcPath, destPath);
          results.workflows.push({ name: wfFile.replace(".md", ""), skipped: 0, copied: 1 });
        }
      }
    }
  }

  // Install MCP servers to platforms with MCP support
  if (platform.mcpConfigPath) {
    try {
      results.mcpServers = mcpInstaller.installMcpServers({ force, platform });
    } catch (error) {
      console.warn(`  ⚠️  MCP install failed: ${error.message}`);
    }
  }

  return results;
}

/**
 * Install skills to all detected platforms
 */
function install(options = {}) {
  const { force = false, skill = null, sync = true } = options;

  // Always sync repo to get latest
  if (sync) {
    console.log("\n📦 Syncing skills from repository...");
    if (!syncRepo()) {
      throw new Error("Failed to sync repository. Check your internet connection.");
    }
  }

  // Check if we have any skills to install
  console.log("DEBUG: PACKAGE_SKILLS_DIR =", PACKAGE_SKILLS_DIR, "- EXISTS:", fs.existsSync(PACKAGE_SKILLS_DIR));
  if (!isRepoCached() && !fs.existsSync(PACKAGE_SKILLS_DIR)) {
    console.log("⚠️  Skills repository not cached. Run 'agentools update' first.");
    return { skillsCount: 0, platformsCount: 0, workflowsCount: 0, details: [] };
  }

  // Always install to all detected platforms
  const targetPlatforms = platforms.detectAll().map((p) => platforms.getByName(p.name));

  if (targetPlatforms.length === 0) {
    console.log("\n⚠️  No AI coding platforms detected.");
    console.log("   Supported platforms:", platforms.getAllNames().join(", "));
    return { skillsCount: 0, platformsCount: 0, workflowsCount: 0, details: [] };
  }

  const details = [];
  let totalSkills = 0;
  let totalWorkflows = 0;

  for (const platformObj of targetPlatforms) {
    try {
      const result = installToPlatform(platformObj, { force, skill });
      details.push(result);
      totalSkills += result.skills.length;
      totalWorkflows += result.workflows.length;
    } catch (error) {
      console.error(`   Failed to install to ${platformObj.name}: ${error.message}`);
    }
  }

  return {
    skillsCount: totalSkills,
    workflowsCount: totalWorkflows,
    platformsCount: details.length,
    details,
  };
}

/**
 * Uninstall skills from a platform
 */
function uninstallFromPlatform(platform, skill = null) {
  const skillsPath = platform.skillsPath;

  if (!fs.existsSync(skillsPath)) {
    return { platform: platform.name, removed: 0 };
  }

  let removed = 0;
  const ourSkills = getAvailableSkills();

  if (skill) {
    const skillPath = path.join(skillsPath, skill);
    if (fs.existsSync(skillPath) && ourSkills.includes(skill)) {
      fs.rmSync(skillPath, { recursive: true });
      removed++;
    }
  } else {
    for (const skillName of ourSkills) {
      const skillPath = path.join(skillsPath, skillName);
      if (fs.existsSync(skillPath)) {
        fs.rmSync(skillPath, { recursive: true });
        removed++;
      }
    }
  }

  return { platform: platform.name, removed };
}

/**
 * Uninstall skills from all platforms
 */
function uninstall(options = {}) {
  const { platform = null, skill = null } = options;

  let targetPlatforms;

  if (platform) {
    const platformObj = platforms.getByName(platform);
    if (!platformObj) {
      throw new Error(`Unknown platform: ${platform}`);
    }
    targetPlatforms = [platformObj];
  } else {
    targetPlatforms = platforms.detectAll().map((p) => platforms.getByName(p.name));
  }

  const results = [];
  let totalRemoved = 0;

  for (const platformObj of targetPlatforms) {
    const result = uninstallFromPlatform(platformObj, skill);
    results.push(result);
    totalRemoved += result.removed;
  }

  return {
    totalRemoved,
    platformsCount: results.length,
    details: results,
  };
}

module.exports = {
  install,
  uninstall,
  syncRepo,
  isRepoCached,
  getAvailableSkills,
  getAvailableWorkflows,
  copyDir,
  CACHE_DIR,
  REPO_URL,
  REPO_SKILLS_DIR,
  REPO_WORKFLOWS_DIR,
  PACKAGE_SKILLS_DIR,
};
