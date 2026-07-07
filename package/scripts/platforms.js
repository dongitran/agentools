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
    agentsDir: "agents",
    workflowsAsSkills: true,
    commandsDir: "commands",
    rulesDir: "rules",
    rulesType: "folder",
    get configPath() {
      return path.join(HOME, this.configDir);
    },
    get skillsPath() {
      return path.join(HOME, this.configDir, this.skillsDir);
    },
    get agentsPath() {
      return path.join(HOME, this.configDir, this.agentsDir);
    },
    get rulesPath() {
      return path.join(HOME, this.configDir, this.rulesDir);
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
    rulesFile: "GEMINI.md",
    rulesType: "file",
    get configPath() {
      return path.join(HOME, this.configDir);
    },
    get skillsPath() {
      return path.join(HOME, this.configDir, this.skillsDir);
    },
    get rulesPath() {
      // ~/.gemini/GEMINI.md (directly in .gemini, not in antigravity subfolder)
      return path.join(HOME, ".gemini", this.rulesFile);
    },
    get workflowsPath() {
      return path.join(HOME, this.configDir, this.workflowsDir);
    },
    get mcpConfigPath() {
      return path.join(HOME, this.configDir, this.mcpConfigFile);
    },
    detect() {
      return (
        fs.existsSync(this.configPath) ||
        fs.existsSync("/Applications/Antigravity.app") ||
        fs.existsSync(path.join(HOME, "Applications", "Antigravity.app"))
      );
    },
  },
  {
    name: "antigravity-cli",
    displayName: "Antigravity CLI",
    configDir: ".gemini/antigravity-cli",
    skillsDir: "skills",
    workflowsAsSkills: true,
    mcpConfigFile: "mcp_config.json",
    rulesFile: "GEMINI.md",
    rulesType: "file",
    get configPath() {
      return path.join(HOME, this.configDir);
    },
    get skillsPath() {
      return path.join(HOME, this.configDir, this.skillsDir);
    },
    get rulesPath() {
      return path.join(HOME, ".gemini", this.rulesFile);
    },
    get mcpConfigPath() {
      return path.join(HOME, this.configDir, this.mcpConfigFile);
    },
    get executablePath() {
      if (process.platform !== "win32") {
        return path.join(HOME, ".local", "bin", "agy");
      }

      const localAppData = process.env.LOCALAPPDATA || path.join(HOME, "AppData", "Local");
      return path.join(localAppData, "agy", "bin", "agy.exe");
    },
    detect() {
      if (fs.existsSync(this.configPath) || fs.existsSync(this.executablePath)) {
        return true;
      }

      const executableName = process.platform === "win32" ? "agy.exe" : "agy";
      const searchPath = process.env.PATH || process.env.Path || "";
      return searchPath
        .split(path.delimiter)
        .filter(Boolean)
        .some((directory) => fs.existsSync(path.join(directory, executableName)));
    },
  },
  {
    name: "cursor",
    displayName: "Cursor",
    configDir: ".cursor",
    skillsDir: "skills",
    rulesDir: "rules",
    rulesType: "folder",
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
    rulesFile: "global_rules.md",
    rulesType: "file",
    get rulesPath() {
      // Windsurf stores global rules in ~/.codeium/windsurf/memories/
      return path.join(HOME, ".codeium", "windsurf", "memories", this.rulesFile);
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
    agentsDir: "agents",
    mcpConfigFile: "config.toml",
    mcpConfigFormat: "toml", // TOML format instead of JSON
    /* c8 ignore start */
    hooks: {
      preInstallAgents: (platform, context) => {
        if (!platform.mcpConfigPath) return null;
        try {
          const config = context.mcpInstaller.readPlatformConfig(platform.mcpConfigPath, "toml");
          if (!config) {
            console.warn(`  ⚠️  Codex config is malformed or null. Skipping agent registration.`);
            return null;
          }
          if (Array.isArray(config.agents)) {
            console.warn(`  ⚠️  Codex config uses [[agents]] array which is currently unsupported for auto-sync. Skipping agent registration.`);
            return null;
          }
          config.agents = config.agents || {};
          return config;
        } catch (err) {
          console.warn(`  ⚠️  Failed to read Codex config: ${err.message}`);
          return null;
        }
      },
      onAgentInstalled: (agentName, destPath, platformConfig, context) => {
        try {
          const jsonPath = context.path.join(destPath, "agent.json");
          const tomlPath = context.path.join(destPath, "agent.toml");
          
          if (context.fs.existsSync(jsonPath)) {
            const agentConfig = JSON.parse(context.fs.readFileSync(jsonPath, "utf-8"));
            context.fs.writeFileSync(tomlPath, context.toml.stringify(agentConfig), "utf-8");
            
            if (platformConfig) {
              platformConfig.agents[agentName] = {
                ...(platformConfig.agents[agentName] || {}),
                description: agentConfig.description || "",
                model: agentConfig.codexModel || agentConfig.model || "gpt-5.4",
                config_file: `agents/${agentName}/agent.toml`
              };
              return true;
            }
          }
        } catch (err) {
          console.warn(`  ⚠️  Failed to configure Codex agent ${agentName}: ${err.message}`);
        }
        return false;
      },
      postInstallAgents: (platform, platformConfig, context) => {
        try {
          context.mcpInstaller.writePlatformConfig(platform.mcpConfigPath, platformConfig, "toml");
        } catch (err) {
          console.warn(`  ⚠️  Failed to save Codex config: ${err.message}`);
        }
      }
    },
    /* c8 ignore stop */
    get configPath() {
      return path.join(HOME, this.configDir);
    },
    get skillsPath() {
      return path.join(HOME, this.configDir, this.skillsDir);
    },
    get agentsPath() {
      return path.join(HOME, this.configDir, this.agentsDir);
    },
    rulesFile: "AGENTS.md",
    rulesType: "file",
    get rulesPath() {
      return path.join(HOME, this.configDir, this.rulesFile);
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
 * Ensure rules directory exists for a platform (folder-type rules like Claude Code, Cursor)
 * @param {Object} platform - Platform object
 * @returns {string|null} Rules path or null if not supported
 */
function ensureRulesDir(platform) {
  if (platform.rulesType !== "folder" || !platform.rulesPath) {
    return null;
  }
  const rulesPath = platform.rulesPath;
  if (!fs.existsSync(rulesPath)) {
    fs.mkdirSync(rulesPath, { recursive: true });
  }
  return rulesPath;
}

/**
 * Ensure agents directory exists for a platform
 * @param {Object} platform - Platform object
 * @returns {string|null} Agents path or null if not supported
 */
function ensureAgentsDir(platform) {
  if (!platform.agentsPath) {
    return null;
  }
  const agentsPath = platform.agentsPath;
  if (!fs.existsSync(agentsPath)) {
    fs.mkdirSync(agentsPath, { recursive: true });
  }
  return agentsPath;
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
  ensureRulesDir,
  ensureAgentsDir,
  getAllNames,
  HOME,
};
