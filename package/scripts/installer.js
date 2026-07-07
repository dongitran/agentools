/**
 * Installer module for AI Agent Config
 * Handles syncing from GitHub repo and copying skills to platform directories
 */

const fs = require("fs");
const path = require("path");
const toml = require("@iarna/toml");
const { execSync } = require("child_process");

const GIT_SYNC_TIMEOUT_MS = 120000;
const GIT_SYNC_MAX_ATTEMPTS = 2;
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
const REPO_AGENTS_DIR = path.join(CACHE_DIR, ".agents", "agents");
const PACKAGE_SKILLS_DIR = path.join(__dirname, "..", ".agents", "skills");
const PACKAGE_WORKFLOWS_DIR = path.join(__dirname, "..", ".agents", "workflows");
const PACKAGE_AGENTS_DIR = path.join(__dirname, "..", ".agents", "agents");

function getUserRepoAgentsDir() {
  try {
    if (configManager.configExists()) {
      const config = configManager.loadConfig();
      if (config.repository && config.repository.local) {
        return path.join(config.repository.local, ".agents", "agents");
      }
    }
  } catch (e) {
    // Ignore error
  }
  return null;
}

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
function getGitErrorMessage(error) {
  const output = [error.stdout, error.stderr]
    .filter(Boolean)
    .map((value) => value.toString().trim())
    .filter(Boolean)
    .join("\n");

  if (error.code === "ETIMEDOUT" || error.signal === "SIGTERM") {
    return `timed out after ${GIT_SYNC_TIMEOUT_MS / 1000}s`;
  }

  return output || error.message;
}

function runGitSyncCommand(command, options = {}) {
  let lastError = null;

  for (let attempt = 1; attempt <= GIT_SYNC_MAX_ATTEMPTS; attempt++) {
    try {
      execSync(command, {
        ...options,
        stdio: "pipe",
        timeout: GIT_SYNC_TIMEOUT_MS,
      });
      return { ok: true };
    } catch (error) {
      lastError = error;
      const message = getGitErrorMessage(error);
      const retryText = attempt < GIT_SYNC_MAX_ATTEMPTS ? " Retrying..." : "";
      console.error(`   Git sync attempt ${attempt}/${GIT_SYNC_MAX_ATTEMPTS} failed: ${message}.${retryText}`);
    }
  }

  return { ok: false, reason: getGitErrorMessage(lastError) };
}

function isGitRepository(dir) {
  return fs.existsSync(path.join(dir, ".git"));
}

function syncRepo() {
  let cacheExists = fs.existsSync(CACHE_DIR);

  if (cacheExists && !isGitRepository(CACHE_DIR)) {
    console.log("   Cached repository is incomplete; recloning...");
    fs.rmSync(CACHE_DIR, { recursive: true, force: true });
    cacheExists = false;
  }

  const command = cacheExists
    ? "git pull --quiet"
    : `git clone --quiet "${REPO_URL}" "${CACHE_DIR}"`;

  console.log(cacheExists ? "   Updating cached repository..." : "   Cloning repository...");

  const result = runGitSyncCommand(command, cacheExists ? { cwd: CACHE_DIR } : {});
  if (!result.ok) {
    console.error(`   Failed to sync: ${result.reason}`);
    return false;
  }

  return true;
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
 * Get list of available agents
 */
function getAvailableAgents() {
  const agents = new Set();

  const dirs = [
    PACKAGE_AGENTS_DIR,
    REPO_AGENTS_DIR,
    getUserRepoAgentsDir()
  ];

  for (const dir of dirs) {
    if (dir && fs.existsSync(dir)) {
      fs.readdirSync(dir).forEach((name) => {
        const agentPath = path.join(dir, name);
        const agentFile = path.join(agentPath, "agent.json");
        if (fs.statSync(agentPath).isDirectory() && fs.existsSync(agentFile)) {
          try {
            const agentContent = fs.readFileSync(agentFile, "utf8");
            const agentData = JSON.parse(agentContent);
            if (!agentData.name || (!agentData.instructions && !agentData.systemPrompt)) {
              console.warn(`  ⚠️  Skipping malformed agent config: ${name}/agent.json (missing name or instructions)`);
              return; // Skip adding
            }
            agents.add(name);
          } catch (e) {
            console.warn(`  ⚠️  Skipping malformed agent config: ${name}/agent.json (${e.message})`);
          }
        }
      });
    }
  }

  return Array.from(agents);
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
 * Install available agents to a platform agents directory.
 */
function installAgents(agentsPath, options = {}, platform = null) {
  const { force = false, skill = null } = options;
  const results = [];
  let agentsToInstall = getAvailableAgents();

  if (skill) {
    if (agentsToInstall.includes(skill)) {
      agentsToInstall = [skill];
    } else {
      agentsToInstall = [];
    }
  }

  const platformContext = { fs, path, toml, mcpInstaller };
  let platformConfig = null;
  let configUpdated = false;

  /* c8 ignore start */
  if (platform && platform.hooks && platform.hooks.preInstallAgents) {
    platformConfig = platform.hooks.preInstallAgents(platform, platformContext);
  }
  /* c8 ignore stop */

  for (const agentName of agentsToInstall) {
    let srcPath = path.join(PACKAGE_AGENTS_DIR, agentName);
    
    if (!fs.existsSync(srcPath)) {
      const userRepoAgentsDir = getUserRepoAgentsDir();
      if (userRepoAgentsDir) {
        const userPath = path.join(userRepoAgentsDir, agentName);
        if (fs.existsSync(userPath)) {
          srcPath = userPath;
        }
      }
    }

    if (!fs.existsSync(srcPath)) {
      srcPath = path.join(REPO_AGENTS_DIR, agentName);
    }

    const destPath = path.join(agentsPath, agentName);
    const copyResult = copyDir(srcPath, destPath, force);
    
    /* c8 ignore start */
    if (platform && platform.hooks && platform.hooks.onAgentInstalled) {
      const mutated = platform.hooks.onAgentInstalled(agentName, destPath, platformConfig, platformContext);
      if (mutated) configUpdated = true;
    }
    /* c8 ignore stop */

    results.push({
      name: agentName,
      ...copyResult,
    });
  }

  /* c8 ignore start */
  if (configUpdated && platform && platform.hooks && platform.hooks.postInstallAgents) {
    platform.hooks.postInstallAgents(platform, platformConfig, platformContext);
  }
  /* c8 ignore stop */

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
  let agents = [];

  if (platform.agentsPath) {
    const agentsPath = platforms.ensureAgentsDir(platform);
    if (agentsPath) {
      agents = installAgents(agentsPath, options, platform);
    }
  }

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
    agents,
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
  let totalAgents = 0;

  for (const platformObj of targetPlatforms) {
    try {
      const result = installToPlatform(platformObj, { force, skill });
      details.push(result);
      totalSkills += result.skills.length;
      totalWorkflows += result.workflows.length;
      if (result.agents) totalAgents += result.agents.length;
    } catch (error) {
      console.error(`   Failed to install to ${platformObj.name}: ${error.message}`);
    }
  }

  console.log("📋 Installing global rules...");
  const rulesResult = rulesInstaller.installRules();

  return {
    skillsCount: totalSkills,
    workflowsCount: totalWorkflows,
    agentsCount: totalAgents,
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
  let removed = 0;
  let removedAgents = 0;

  if (fs.existsSync(skillsPath)) {
    const ourSkills = platform.workflowsAsSkills
      ? [...new Set([...getAvailableSkills(), ...getAvailableWorkflows()])]
      : getAvailableSkills();

    if (skill) {
      const skillPath = path.join(skillsPath, skill);
      if (fs.existsSync(skillPath) && ourSkills.includes(skill)) {
        fs.rmSync(skillPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
        removed++;
      }
    } else {
      for (const skillName of ourSkills) {
        const skillPath = path.join(skillsPath, skillName);
        if (fs.existsSync(skillPath)) {
          fs.rmSync(skillPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
          removed++;
        }
      }
    }
  }

  // Remove agents if supported
  if (platform.agentsPath && fs.existsSync(platform.agentsPath)) {
    const ourAgents = getAvailableAgents();
    
    // If a specific skill name was provided, maybe it's an agent name too
    if (skill) {
      const agentPath = path.join(platform.agentsPath, skill);
      if (fs.existsSync(agentPath) && ourAgents.includes(skill)) {
        fs.rmSync(agentPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
        removedAgents++;
      }
    } else {
      for (const agentName of ourAgents) {
        const agentPath = path.join(platform.agentsPath, agentName);
        if (fs.existsSync(agentPath)) {
          fs.rmSync(agentPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
          removedAgents++;
        }
      }
    }
  }

  return { platform: platform.name, removed, removedAgents };
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
  let totalRemovedAgents = 0;

  for (const platformObj of targetPlatforms) {
    const result = uninstallFromPlatform(platformObj, skill);
    results.push(result);
    totalRemoved += result.removed;
    totalRemovedAgents += (result.removedAgents || 0);
  }

  return {
    totalRemoved,
    totalRemovedAgents,
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
  getAvailableAgents,
  getAvailableWorkflows,
  copyDir,
  isGitRepository,
  CACHE_DIR,
  REPO_URL,
  REPO_SKILLS_DIR,
  REPO_WORKFLOWS_DIR,
  REPO_AGENTS_DIR,
  PACKAGE_SKILLS_DIR,
  PACKAGE_WORKFLOWS_DIR,
  PACKAGE_AGENTS_DIR,
  GIT_SYNC_TIMEOUT_MS,
  GIT_SYNC_MAX_ATTEMPTS,
};
