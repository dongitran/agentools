/**
 * MCP Installer Module
 * Handles discovering, validating, and installing MCP servers from repo to platforms
 */

const fs = require("fs");
const path = require("path");
const toml = require("@iarna/toml");
const platforms = require("./platforms");
const configManager = require("./config-manager");

const SKIP_FOLDERS = ["bitwarden"];

// Config format constants
const FORMAT_JSON = "json";
const FORMAT_TOML = "toml";
const TOML_MCP_KEY = "mcp_servers";  // Underscore! Not dot
const JSON_MCP_KEY = "mcpServers";   // CamelCase

/**
 * Get the MCP servers directory from the user's sync repo
 * @returns {string|null} Path to .agents/mcp-servers/ or null
 */
function getMcpServersDir() {
    const config = configManager.loadConfig();
    const repoLocal = config.repository && config.repository.local;
    if (!repoLocal) return null;

    const expanded = repoLocal.replace(/^~/, process.env.HOME || process.env.USERPROFILE);
    const mcpDir = path.join(expanded, ".agents", "mcp-servers");
    return fs.existsSync(mcpDir) ? mcpDir : null;
}

/**
 * Validate an MCP server config
 * @param {Object} config - Parsed config.json
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateMcpConfig(config) {
    const errors = [];

    if (!config.name || typeof config.name !== "string") {
        errors.push("Missing or invalid 'name' field");
    }
    if (!config.command || typeof config.command !== "string") {
        errors.push("Missing or invalid 'command' field");
    }
    if (!Array.isArray(config.args)) {
        errors.push("Missing or invalid 'args' field (must be array)");
    }
    if (config.bitwardenEnv && typeof config.bitwardenEnv !== "object") {
        errors.push("'bitwardenEnv' must be an object");
    }
    if (config.disabledTools && !Array.isArray(config.disabledTools)) {
        errors.push("'disabledTools' must be an array");
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Get all available MCP servers from the repo
 * @returns {Array<Object>} Array of parsed and validated MCP server configs
 */
function getAvailableMcpServers() {
    const mcpDir = getMcpServersDir();
    if (!mcpDir) return [];

    const servers = [];

    const entries = fs.readdirSync(mcpDir, { withFileTypes: true });
    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (SKIP_FOLDERS.includes(entry.name)) continue;

        const configPath = path.join(mcpDir, entry.name, "config.json");
        if (!fs.existsSync(configPath)) continue;

        try {
            const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
            const validation = validateMcpConfig(config);
            if (!validation.valid) {
                console.warn(`  ⚠️  Invalid MCP config in ${entry.name}/: ${validation.errors.join(", ")}`);
                continue;
            }
            servers.push(config);
        } catch (error) {
            console.warn(`  ⚠️  Failed to parse ${entry.name}/config.json: ${error.message}`);
        }
    }

    return servers;
}

/**
 * Get config format for a platform
 * @param {string} platformName - Platform name
 * @returns {string} "json" or "toml"
 */
function getConfigFormat(platformName) {
    const platform = platforms.getByName(platformName);
    return platform?.mcpConfigFormat || FORMAT_JSON;
}

/**
 * Read platform config file (supports JSON and TOML)
 * @param {string} configPath - Path to config file
 * @param {string} format - "json" or "toml"
 * @returns {Object} Parsed config or empty object
 */
function readPlatformConfig(configPath, format) {
    if (!fs.existsSync(configPath)) {
        return {};
    }

    try {
        const content = fs.readFileSync(configPath, "utf-8");

        if (format === FORMAT_TOML) {
            return toml.parse(content);
        } else {
            return JSON.parse(content);
        }
    } catch (error) {
        console.warn(`⚠️  Failed to parse config at ${configPath}: ${error.message}`);
        return {};
    }
}

/**
 * Write platform config file (supports JSON and TOML)
 * @param {string} configPath - Path to config file
 * @param {Object} config - Config object to write
 * @param {string} format - "json" or "toml"
 */
function writePlatformConfig(configPath, config, format) {
    let content;

    if (format === FORMAT_TOML) {
        content = toml.stringify(config);
    } else {
        content = JSON.stringify(config, null, 2) + "\n";
    }

    // Create directory if needed
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }

    fs.writeFileSync(configPath, content, "utf-8");

    // Set restrictive permissions (owner read/write only) to protect secrets
    // Only on Unix-like systems (macOS, Linux) - Windows uses ACL instead
    if (process.platform !== "win32") {
        try {
            fs.chmodSync(configPath, 0o600);
        } catch (e) {
            console.warn(`⚠️  Warning: Could not set file permissions on ${configPath}: ${e.message}`);
        }
    }
}

/**
 * Build server config object with platform-specific fields
 * @param {Object} server - Server config from repo
 * @param {string} platformName - Platform name
 * @param {Object} existing - Existing server config (for preservation)
 * @returns {Object} Platform-specific server config
 */
function buildServerConfig(server, platformName, existing = {}) {
    const config = {
        command: server.command,
        args: server.args,
    };

    // Preserve existing env vars
    if (existing.env) {
        config.env = existing.env;
    }

    // Platform-specific field handling
    switch (platformName) {
        case "antigravity":
            // Antigravity supports disabledTools
            // Preserve existing disabledTools, or use server's if present
            if (existing.disabledTools) {
                config.disabledTools = existing.disabledTools;
            } else if (server.disabledTools && server.disabledTools.length > 0) {
                config.disabledTools = server.disabledTools;
            }
            break;

        case "windsurf":
            // Windsurf uses "disabled" boolean field
            // Preserve user's manual setting, otherwise use repo default
            if (existing.disabled !== undefined) {
                config.disabled = existing.disabled;
            } else if (server.enabled !== undefined) {
                config.disabled = !server.enabled;
            }
            break;

        case "codex":
            // Codex supports enabled, enabled_tools, disabled_tools
            // Preserve user's manual settings, otherwise use repo defaults
            if (existing.enabled !== undefined) {
                config.enabled = existing.enabled;
            } else if (server.enabled !== undefined) {
                config.enabled = server.enabled;
            }

            if (existing.disabled_tools) {
                config.disabled_tools = existing.disabled_tools;
            } else if (server.disabledTools && server.disabledTools.length > 0) {
                config.disabled_tools = server.disabledTools; // Note: snake_case
            }
            break;

        case "claude":
            // Claude doesn't support disabledTools - skip
            break;

        case "cursor":
            // Cursor doesn't support disabledTools - skip
            break;
    }

    return config;
}

/**
 * Collect all bitwardenEnv entries from MCP server configs
 * @returns {Array<{ serverName: string, envVar: string, bitwardenItem: string }>}
 */
function collectBitwardenEnvs() {
    const servers = getAvailableMcpServers();
    const envs = [];

    for (const server of servers) {
        if (server.enabled === false) continue;
        if (!server.bitwardenEnv) continue;

        for (const [envVar, bitwardenItem] of Object.entries(server.bitwardenEnv)) {
            envs.push({
                serverName: server.name,
                envVar,
                bitwardenItem,
            });
        }
    }

    return envs;
}

/**
 * Write MCP servers to a platform's config file
 * @param {string} configPath - Path to platform's MCP config file
 * @param {Array} servers - MCP server configs to install
 * @param {Object} options - { force, platformName }
 * @returns {{ added: number, skipped: number }}
 */
function writeMcpToPlatformConfig(configPath, servers, options = {}) {
    const { force = false, platformName = "" } = options;

    // Determine config format
    const format = getConfigFormat(platformName);

    // Read existing config — preserve ALL existing keys
    let config = readPlatformConfig(configPath, format);

    // Initialize MCP servers section if not exists
    const mcpKey = format === FORMAT_TOML ? TOML_MCP_KEY : JSON_MCP_KEY;
    if (!config[mcpKey]) {
        config[mcpKey] = {};
    }

    let added = 0;
    let skipped = 0;

    for (const server of servers) {
        const existing = config[mcpKey][server.name];

        if (existing && !force) {
            skipped++;
            continue;
        }

        // Build platform-specific config
        const entry = buildServerConfig(server, platformName, existing);

        config[mcpKey][server.name] = entry;
        added++;
    }

    // Write back only if changes were made
    if (added > 0) {
        writePlatformConfig(configPath, config, format);
    }

    return { added, skipped };
}

/**
 * Install MCP servers to platforms' config files
 * This is the "pull" flow - installs structure without resolved secrets
 * @param {Object} options - { force: boolean, platform: Object|null }
 * @returns {{ added: number, skipped: number, servers: string[] }}
 */
function installMcpServers(options = {}) {
    const { force = false, platform = null } = options;

    const servers = getAvailableMcpServers().filter((s) => s.enabled !== false);
    if (servers.length === 0) {
        return { added: 0, skipped: 0, servers: [] };
    }

    // Determine target platforms
    const targetPlatforms = [];
    if (platform) {
        // Single platform specified
        if (platform.mcpConfigPath) targetPlatforms.push(platform);
    } else {
        // All detected platforms with MCP support
        for (const p of platforms.detectAll()) {
            const full = platforms.getByName(p.name);
            if (full && full.mcpConfigPath) targetPlatforms.push(full);
        }
    }

    if (targetPlatforms.length === 0) {
        return { added: 0, skipped: 0, servers: [] };
    }

    let totalAdded = 0;
    let totalSkipped = 0;
    const serverNames = [...new Set(servers.map((s) => s.name))];

    for (const p of targetPlatforms) {
        const result = writeMcpToPlatformConfig(p.mcpConfigPath, servers, {
            force,
            platformName: p.name,
        });
        totalAdded += result.added;
        totalSkipped += result.skipped;
    }

    return { added: totalAdded, skipped: totalSkipped, servers: serverNames };
}

/**
 * Write MCP servers with resolved secrets to a platform's config file
 * @param {string} configPath - Path to platform's MCP config file
 * @param {Array} servers - MCP server configs
 * @param {Object} resolvedSecrets - Map of bitwardenItem → resolvedValue
 * @param {string} platformName - Platform name for format and field handling
 * @returns {{ installed: number, servers: Array<{ name: string, secretsCount: number }> }}
 */
function writeMcpWithSecretsToPlatformConfig(configPath, servers, resolvedSecrets, platformName) {
    // Determine config format
    const format = getConfigFormat(platformName);

    // Read existing config — preserve ALL existing keys
    let config = readPlatformConfig(configPath, format);

    // Initialize MCP servers section if not exists
    const mcpKey = format === FORMAT_TOML ? TOML_MCP_KEY : JSON_MCP_KEY;
    if (!config[mcpKey]) {
        config[mcpKey] = {};
    }

    let installed = 0;
    const serverResults = [];

    for (const server of servers) {
        const existing = config[mcpKey][server.name] || {};

        // Build platform-specific config
        const entry = buildServerConfig(server, platformName, existing);

        // Build env from resolved secrets
        if (server.bitwardenEnv) {
            const env = {};
            let secretsCount = 0;

            for (const [envVar, bitwardenItem] of Object.entries(server.bitwardenEnv)) {
                if (resolvedSecrets[bitwardenItem]) {
                    env[envVar] = resolvedSecrets[bitwardenItem];
                    secretsCount++;
                }
            }

            if (Object.keys(env).length > 0) {
                entry.env = { ...(existing.env || {}), ...env };
            }

            serverResults.push({ name: server.name, secretsCount });
        } else {
            serverResults.push({ name: server.name, secretsCount: 0 });
        }

        config[mcpKey][server.name] = entry;
        installed++;
    }

    // Write back
    if (installed > 0) {
        writePlatformConfig(configPath, config, format);
    }

    return { installed, servers: serverResults };
}

/**
 * Install MCP servers with resolved secrets to all MCP-capable platforms
 * This is the "secrets sync" flow - updates env with real values
 * @param {Object} resolvedSecrets - Map of bitwardenItem → resolvedValue
 * @returns {{ installed: number, servers: Array<{ name: string, secretsCount: number }> }}
 */
function installMcpServersWithSecrets(resolvedSecrets) {
    const allServers = getAvailableMcpServers().filter((s) => s.enabled !== false);
    if (allServers.length === 0) {
        return { installed: 0, servers: [] };
    }

    // All detected platforms with MCP support
    const targetPlatforms = [];
    for (const p of platforms.detectAll()) {
        const full = platforms.getByName(p.name);
        if (full && full.mcpConfigPath) targetPlatforms.push(full);
    }

    if (targetPlatforms.length === 0) {
        return { installed: 0, servers: [] };
    }

    let totalInstalled = 0;
    let aggregatedServers = [];

    for (const p of targetPlatforms) {
        const result = writeMcpWithSecretsToPlatformConfig(
            p.mcpConfigPath, allServers, resolvedSecrets, p.name
        );
        totalInstalled += result.installed;
        // Use server results from last platform (they're the same servers)
        if (result.servers.length > 0) {
            aggregatedServers = result.servers;
        }
    }

    return { installed: totalInstalled, servers: aggregatedServers };
}

module.exports = {
    getMcpServersDir,
    validateMcpConfig,
    getAvailableMcpServers,
    collectBitwardenEnvs,
    installMcpServers,
    installMcpServersWithSecrets,
    writeMcpToPlatformConfig,
    // New helper functions (for testing)
    getConfigFormat,
    readPlatformConfig,
    writePlatformConfig,
    buildServerConfig,
    SKIP_FOLDERS,
};
