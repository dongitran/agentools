/**
 * Platform detection for AI coding assistants
 * Detects which platforms are installed and returns their global skills paths
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

const HOME = os.homedir();

/**
 * Supported platforms configuration
 */
const SUPPORTED = [
  {
    name: "claude",
    displayName: "Claude Code",
    configDir: ".claude",
    skillsDir: "skills",
    workflowsDir: "workflows",
    commandsDir: "commands",
    get configPath() {
      return path.join(HOME, this.configDir);
    },
    get skillsPath() {
      return path.join(HOME, this.configDir, this.skillsDir);
    },
    get workflowsPath() {
      return path.join(HOME, this.configDir, this.workflowsDir);
    },
    get commandsPath() {
      return path.join(HOME, this.configDir, this.commandsDir);
    },
    get mcpConfigPath() {
      // Claude Code CLI stores MCP servers in ~/.claude.json (cross-platform)
      // Note: This is different from Claude Desktop which uses claude_desktop_config.json
      return path.join(HOME, ".claude.json");
    },
    detect() {
      return fs.existsSync(this.configPath);
    },
  },
  {
    name: "antigravity",
    displayName: "Antigravity IDE",
    configDir: ".gemini/antigravity",
    skillsDir: "skills",
    workflowsDir: "global_workflows",
    mcpConfigFile: "mcp_config.json",
    get configPath() {
      return path.join(HOME, this.configDir);
    },
    get skillsPath() {
      return path.join(HOME, this.configDir, this.skillsDir);
    },
    get workflowsPath() {
      return path.join(HOME, this.configDir, this.workflowsDir);
    },
    get mcpConfigPath() {
      return path.join(HOME, this.configDir, this.mcpConfigFile);
    },
    detect() {
      // Check for .gemini directory or Antigravity app
      return (
        fs.existsSync(path.join(HOME, ".gemini")) ||
        fs.existsSync("/Applications/Antigravity.app") ||
        fs.existsSync(path.join(HOME, "Applications", "Antigravity.app"))
      );
    },
  },
  {
    name: "cursor",
    displayName: "Cursor",
    configDir: ".cursor",
    skillsDir: "skills",
    rulesDir: "rules",
    mcpConfigFile: "mcp.json",
    get configPath() {
      return path.join(HOME, this.configDir);
    },
    get skillsPath() {
      return path.join(HOME, this.configDir, this.skillsDir);
    },
    get rulesPath() {
      return path.join(HOME, this.configDir, this.rulesDir);
    },
    get mcpConfigPath() {
      return path.join(HOME, this.configDir, this.mcpConfigFile);
    },
    detect() {
      return (
        fs.existsSync(this.configPath) ||
        fs.existsSync("/Applications/Cursor.app") ||
        fs.existsSync(path.join(HOME, "Applications", "Cursor.app"))
      );
    },
  },
  {
    name: "windsurf",
    displayName: "Windsurf",
    configDir: ".windsurf",
    skillsDir: "skills",
    mcpConfigFile: "mcp_config.json",
    get configPath() {
      return path.join(HOME, this.configDir);
    },
    get skillsPath() {
      return path.join(HOME, this.configDir, this.skillsDir);
    },
    get mcpConfigPath() {
      // Windsurf stores config in ~/.codeium/windsurf/
      return path.join(HOME, ".codeium", "windsurf", this.mcpConfigFile);
    },
    detect() {
      return (
        fs.existsSync(this.configPath) ||
        fs.existsSync("/Applications/Windsurf.app")
      );
    },
  },
  {
    name: "codex",
    displayName: "Codex CLI",
    configDir: ".codex",
    skillsDir: "skills",
    mcpConfigFile: "config.toml",
    mcpConfigFormat: "toml", // TOML format instead of JSON
    get configPath() {
      return path.join(HOME, this.configDir);
    },
    get skillsPath() {
      return path.join(HOME, this.configDir, this.skillsDir);
    },
    get mcpConfigPath() {
      return path.join(HOME, this.configDir, this.mcpConfigFile);
    },
    detect() {
      return fs.existsSync(this.configPath);
    },
  },
  {
    name: "copilot",
    displayName: "GitHub Copilot",
    configDir: ".github",
    instructionsFile: "copilot-instructions.md",
    get configPath() {
      return path.join(HOME, this.configDir);
    },
    get instructionsPath() {
      return path.join(HOME, this.configDir, this.instructionsFile);
    },
    detect() {
      // Check for actual Copilot instructions file, not just ~/.github directory
      // (which is created by gh CLI for auth tokens, causing false positives)
      return fs.existsSync(this.instructionsPath);
    },
  },
];

/**
 * Detect all installed platforms
 * @returns {Array} Array of detected platform objects
 */
function detectAll() {
  return SUPPORTED.filter((platform) => platform.detect()).map((platform) => ({
    name: platform.name,
    displayName: platform.displayName,
    configPath: platform.configPath,
    skillsPath: platform.skillsPath,
  }));
}

/**
 * Get platform by name
 * @param {string} name - Platform name
 * @returns {Object|null} Platform object or null
 */
function getByName(name) {
  return SUPPORTED.find((p) => p.name === name.toLowerCase()) || null;
}

/**
 * Ensure skills directory exists for a platform
 * @param {Object} platform - Platform object
 */
function ensureSkillsDir(platform) {
  const skillsPath = platform.skillsPath;
  if (!fs.existsSync(skillsPath)) {
    fs.mkdirSync(skillsPath, { recursive: true });
  }
  return skillsPath;
}

/**
 * Ensure workflows directory exists for a platform
 * @param {Object} platform - Platform object
 * @returns {string|null} Workflows path or null if not supported
 */
function ensureWorkflowsDir(platform) {
  if (!platform.workflowsPath) {
    return null;
  }
  const workflowsPath = platform.workflowsPath;
  if (!fs.existsSync(workflowsPath)) {
    fs.mkdirSync(workflowsPath, { recursive: true });
  }
  return workflowsPath;
}

/**
 * Get all supported platform names
 * @returns {Array} Array of platform names
 */
function getAllNames() {
  return SUPPORTED.map((p) => p.name);
}

module.exports = {
  SUPPORTED,
  detectAll,
  getByName,
  ensureSkillsDir,
  ensureWorkflowsDir,
  getAllNames,
  HOME,
};
