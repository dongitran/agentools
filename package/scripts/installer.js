/**
 * Installer module for AI Agent Config
 * Handles syncing from GitHub repo and copying skills to platform directories
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const platforms = require("./platforms");

const mcpInstaller = require("./mcp-installer");
const rulesInstaller = require("./rules-installer");
const configManager = require("./config-manager");

function getUserRepoSkillsDir() {
  try {
    if (configManager.configExists()) {
      const config = configManager.loadConfig();
      if (config.repository && config.repository.local) {
        return path.join(config.repository.local, ".agents", "skills");
      }
    }
  } catch (e) {
    // Ignore error
  }
  return null;
}

function getUserRepoWorkflowsDir() {
  try {
    if (configManager.configExists()) {
      const config = configManager.loadConfig();
      if (config.repository && config.repository.local) {
        return path.join(config.repository.local, ".agents", "workflows");
      }
    }
  } catch (e) {
    // Ignore error
  }
  return null;
}

const REPO_URL = "https://github.com/dongitran/agentools.git";
const CACHE_DIR = path.join(platforms.HOME, ".agentools-cache");
const REPO_SKILLS_DIR = path.join(CACHE_DIR, ".agents", "skills");
const REPO_WORKFLOWS_DIR = path.join(CACHE_DIR, ".agents", "workflows");
const PACKAGE_SKILLS_DIR = path.join(__dirname, "..", ".agents", "skills");
const PACKAGE_WORKFLOWS_DIR = path.join(__dirname, "..", ".agents", "workflows");

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

  const dirs = [
    PACKAGE_SKILLS_DIR,
    REPO_SKILLS_DIR,
    getUserRepoSkillsDir()
  ];

  for (const dir of dirs) {
    if (dir && fs.existsSync(dir)) {
      fs.readdirSync(dir).forEach((name) => {
        const skillPath = path.join(dir, name);
        const skillFile = path.join(skillPath, "SKILL.md");
        if (fs.statSync(skillPath).isDirectory() && fs.existsSync(skillFile)) {
          skills.add(name);
        }
      });
    }
  }

  return Array.from(skills);
}

/**
 * Get all workflow files from both package and repo cache (merged, package first).
 * Returns array of { name, srcPath } objects.
 */
function getAllWorkflowFiles() {
  const workflows = new Map();

  const dirs = [
    REPO_WORKFLOWS_DIR,
    getUserRepoWorkflowsDir(),
    PACKAGE_WORKFLOWS_DIR
  ];

  for (const dir of dirs) {
    if (dir && fs.existsSync(dir)) {
      fs.readdirSync(dir)
        .filter((f) => f.endsWith(".md"))
        .forEach((f) => workflows.set(f, path.join(dir, f)));
    }
  }

  return Array.from(workflows.entries()).map(([name, srcPath]) => ({ name, srcPath }));
}

/**
 * Get list of available workflows from package + cached repo
 */
function getAvailableWorkflows() {
  return getAllWorkflowFiles().map((wf) => wf.name.replace(".md", ""));
}

/**
 * Copy workflows as skills for platforms whose workflows are slash-command skills.
 */
function copyWorkflowsAsSkills(skillsPath, force = false) {
  const results = [];
  const workflowFiles = getAllWorkflowFiles();

  for (const { name: wfFile, srcPath } of workflowFiles) {
    const workflowName = wfFile.replace(".md", "");
    const destDir = path.join(skillsPath, workflowName);
    const destPath = path.join(destDir, "SKILL.md");

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
 * Install available skills to a platform skills directory.
 */
function installSkills(skillsPath, options = {}) {
  const { force = false, skill = null } = options;
  const results = [];
  let skillsToInstall = getAvailableSkills();

  if (skill) {
    skillsToInstall = skillsToInstall.filter((s) => s === skill);
    if (skillsToInstall.length === 0) {
      throw new Error(`Skill "${skill}" not found in repository`);
    }
  }

  for (const skillName of skillsToInstall) {
    // Try package skills first, then user repo, then repo cache
    let srcPath = path.join(PACKAGE_SKILLS_DIR, skillName);
    
    if (!fs.existsSync(srcPath)) {
      const userRepoSkillsDir = getUserRepoSkillsDir();
      if (userRepoSkillsDir) {
        const userPath = path.join(userRepoSkillsDir, skillName);
        if (fs.existsSync(userPath)) {
          srcPath = userPath;
        }
      }
    }

    if (!fs.existsSync(srcPath)) {
      srcPath = path.join(REPO_SKILLS_DIR, skillName);
    }

    const destPath = path.join(skillsPath, skillName);
    const copyResult = copyDir(srcPath, destPath, force);
    results.push({
      name: skillName,
      ...copyResult,
    });
  }

  return results;
}

/**
 * Install workflows using the platform's native or skill-based representation.
 */
function installWorkflows(platform, skillsPath, force = false) {
  const workflowFiles = getAllWorkflowFiles();
  const workflowsPath = platform.workflowsAsSkills
    ? skillsPath
    : platforms.ensureWorkflowsDir(platform);

  if (workflowFiles.length === 0 || !workflowsPath) {
    return { workflowsPath, workflows: [] };
  }
  if (platform.workflowsAsSkills) {
    return {
      workflowsPath,
      workflows: copyWorkflowsAsSkills(skillsPath, force),
    };
  }

  const workflows = [];
  for (const { name: workflowFile, srcPath } of workflowFiles) {
    const destPath = path.join(workflowsPath, workflowFile);
    const name = workflowFile.replace(".md", "");

    if (fs.existsSync(destPath) && !force) {
      workflows.push({ name, skipped: 1, copied: 0 });
    } else {
      fs.copyFileSync(srcPath, destPath);
      workflows.push({ name, skipped: 0, copied: 1 });
    }
  }

  return { workflowsPath, workflows };
}

/**
 * Install skills and workflows to a specific platform.
 */
function installToPlatform(platform, options = {}) {
  const { force = false } = options;
  const skillsPath = platforms.ensureSkillsDir(platform);
  const skills = installSkills(skillsPath, options);
  const workflowResult = installWorkflows(platform, skillsPath, force);
  let mcpServers = null;

  if (platform.mcpConfigPath) {
    try {
      mcpServers = mcpInstaller.installMcpServers({ force, platform });
    } catch (error) {
      console.warn(`  ⚠️  MCP install failed: ${error.message}`);
    }
  }

  return {
    platform: platform.name,
    skillsPath,
    workflowsPath: workflowResult.workflowsPath,
    skills,
    workflows: workflowResult.workflows,
    mcpServers,
  };
}

/**
 * Install skills to all detected platforms
 */
function install(options = {}) {
  const { force = false, skill = null, sync = true } = options;

  if (sync) {
    console.log("\n📦 Syncing skills from repository...");
    if (!syncRepo()) {
      throw new Error("Failed to sync repository. Check your internet connection.");
    }
  }

  if (!isRepoCached() && !fs.existsSync(PACKAGE_SKILLS_DIR)) {
    console.log("⚠️  Skills repository not cached. Run 'agentools update' first.");
    return { skillsCount: 0, platformsCount: 0, workflowsCount: 0, details: [] };
  }

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

  console.log("📋 Installing global rules...");
  const rulesResult = rulesInstaller.installRules();

  return {
    skillsCount: totalSkills,
    workflowsCount: totalWorkflows,
    rulesCount: rulesResult.rulesCount,
    platformsCount: details.length,
    details,
    rulesDetails: rulesResult.details,
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
  const ourSkills = platform.workflowsAsSkills
    ? [...new Set([...getAvailableSkills(), ...getAvailableWorkflows()])]
    : getAvailableSkills();

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
  PACKAGE_WORKFLOWS_DIR,
};
