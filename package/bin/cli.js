#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const configManager = require("../scripts/config-manager");
const installer = require("../scripts/installer");
const platforms = require("../scripts/platforms");
const migration = require("../scripts/migration");
const externalSync = require("../scripts/external-sync");
const secretManager = require("../scripts/secret-manager");

const VERSION = require("../package.json").version;

function showHelp() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║               AI Agent Config CLI v${VERSION.padEnd(27)}║
║   Universal Global Skills for AI Coding Assistants            ║
╚═══════════════════════════════════════════════════════════════╝

Usage: agentools <command> [options]

📦 Source Management:
  source add <repo> [opts]    Add custom skill source
  source remove <name>        Remove custom source
  source list                 List all sources (official + custom)
  source enable <name>        Enable a source
  source disable <name>       Disable a source
  source info <name>          Show source details

⚙️  Config Management:
  config get <key>            Get config value (e.g. version)
  config set <key> <value>    Set config value
  config edit                 Open config in $EDITOR
  config validate             Validate config file
  config export [file]        Export config to file
  config import <file>        Import config from file
  config reset                Reset to default config

🔧 Installation & Sync:
  update [opts]               Update all skills from sources
  list                        List installed skills
  uninstall [opts]            Uninstall skills from platforms

🔄 GitHub Sync:
  init [--repo <url>]         Initialize config and clone repository
  push [--message <msg>]      Push skills to GitHub
  pull                        Pull skills from GitHub

🔐 Secret Management:
  secrets sync                Sync MCP secrets from Bitwarden

🔍 External Skills:
  sync-external [opts]        Sync skills from external sources
  list-external               List available external skills

🌐 Examples:

  # Initialize with GitHub repository
  agentools init --repo https://github.com/yourname/my-ai-skills.git

  # Push skills to GitHub
  agentools push --message "Added new skills"

  # Pull latest skills from GitHub
  agentools pull

  # Add a custom source
  agentools source add https://github.com/user/repo.git \\
    --branch main \\
    --name company-skills

  # Update all skills
  agentools update

  # Export your config to share with team
  agentools config export my-config.json

  # Import team config
  agentools config import team-config.json --merge

📍 Config location: ~/.agentools/config.json
📦 Cache location: ~/.agentools-external-cache/

Repository: https://github.com/dongitran/agentools
`);
}

function showPlatforms() {
  console.log("\n🔍 Detecting platforms...\n");

  const detected = platforms.detectAll();

  if (detected.length === 0) {
    console.log("No AI coding platforms detected in home directory.\n");
    console.log("Supported platforms:");
    platforms.SUPPORTED.forEach((p) => {
      console.log(`  - ${p.displayName} (~/${p.configDir})`);
    });
    return;
  }

  console.log("Detected platforms:\n");
  detected.forEach((p) => {
    console.log(`  ✓ ${p.displayName}`);
    console.log(`    Skills: ${p.skillsPath}`);
    console.log("");
  });
}

function listSkills() {
  console.log("\n📦 Installed Skills\n");

  if (!installer.isRepoCached()) {
    console.log("⚠️  Repository not synced yet.");
    console.log("   Run: agentools update\n");
    return;
  }

  const skills = installer.getAvailableSkills();
  const workflows = installer.getAvailableWorkflows();

  console.log("Skills:");
  if (skills.length === 0) {
    console.log("  (no skills found)");
  } else {
    skills.forEach((skill) => {
      const skillFile = path.join(installer.REPO_SKILLS_DIR, skill, "SKILL.md");
      let desc = "";
      if (fs.existsSync(skillFile)) {
        const content = fs.readFileSync(skillFile, "utf-8");
        const match = content.match(/description:\s*(.+)/i);
        if (match) desc = `- ${match[1]}`;
      }
      console.log(`  • ${skill} ${desc}`);
    });
  }

  console.log("\nWorkflows:");
  if (workflows.length === 0) {
    console.log("  (no workflows found)");
  } else {
    workflows.forEach((wf) => {
      console.log(`  • ${wf}`);
    });
  }

  // MCP Servers
  const mcpInstaller = require("../scripts/mcp-installer");
  const mcpServers = mcpInstaller.getAvailableMcpServers();

  console.log("\nMCP Servers:");
  if (mcpServers.length === 0) {
    console.log("  (no MCP servers found)");
  } else {
    mcpServers.forEach((server) => {
      const status = server.enabled === false ? " (disabled)" : "";
      const desc = server.description ? ` - ${server.description}` : "";
      console.log(`  • ${server.name}${desc}${status}`);
    });
  }

  console.log(`\nSource: ${installer.CACHE_DIR}`);
  console.log("");
}

/**
 * Get argument value by flag name
 */
function getArgValue(args, flag) {
  for (let i = 0; i < args.length; i++) {
    if (args[i] === flag && args[i + 1]) {
      return args[i + 1];
    }
  }
  return null;
}

function init(args) {
  console.log("\n🚀 Initializing AI Agent Config...\n");

  const force = args.includes("--force");
  const repoUrl = getArgValue(args, "--repo");

  // Check if migration needed
  if (migration.needsMigration()) {
    const result = migration.migrate({ silent: false });
    if (!result.migrated) {
      console.log(`⚠️  ${result.reason}\n`);
      return;
    }
  } else {
    console.log("✅ Config already exists at:", configManager.getConfigPath());

    if (force) {
      console.log("🔄 Resetting config...");
      configManager.resetConfig();
      console.log("✅ Config reset to defaults\n");
    } else if (!repoUrl) {
      console.log("\n💡 Use --force to reset config to defaults");
      console.log("💡 Use --repo <url> to initialize with a repository");
    }
  }

  // Handle --repo flag
  if (repoUrl) {
    console.log(`\n📦 Setting up repository: ${repoUrl}`);

    const config = configManager.loadConfig();
    const localPath = path.join(process.env.HOME || process.env.USERPROFILE, ".agentools", "sync-repo");

    // Clone if not exists
    if (!fs.existsSync(localPath)) {
      try {
        console.log(`🔄 Cloning repository to ${localPath}...`);
        execSync(`git clone "${repoUrl}" "${localPath}"`, { stdio: "inherit" });
        console.log("✅ Repository cloned successfully!");
      } catch (error) {
        console.error(`❌ Failed to clone repository: ${error.message}\n`);
        return;
      }
    } else {
      console.log(`⚠️  Directory ${localPath} already exists, skipping clone`);
    }

    // Update config
    configManager.setConfigValue("repository.url", repoUrl);
    configManager.setConfigValue("repository.local", localPath);
    console.log("✅ Repository configured!\n");

    // Auto-install after initial clone
    console.log("📥 Auto-installing skills + MCP servers...\n");
    install(["--force", "--no-sync"]);
  }

  const detected = platforms.detectAll();
  if (detected.length > 0) {
    console.log("\n📍 Detected platforms:");
    detected.forEach((p) => console.log(`  ✓ ${p.displayName}`));
  }

  console.log("\n📚 Next steps:");
  if (repoUrl) {
    console.log("  1. agentools push            # Push skills to repository");
    console.log("  2. agentools pull            # Pull skills from repository");
  } else {
    console.log("  1. agentools source add ...  # Add custom sources");
    console.log("  2. agentools update          # Update from sources");
  }
  console.log("");
}

function migrateCmd() {
  migration.migrate({ silent: false });
}

// Source Management Commands
function sourceAdd(args) {
  if (args.length === 0) {
    console.log("\n❌ Missing repository URL");
    console.log("Usage: agentools source add <repo-url> [options]");
    console.log("\nOptions:");
    console.log("  --name <name>           Source name (default: auto-generated)");
    console.log("  --branch <branch>       Git branch (default: main)");
    console.log("  --path <path>           Path to skills in repo (default: skills)");
    console.log("  --exclude <paths>       Comma-separated paths to exclude");
    console.log("\nExample:");
    console.log("  agentools source add https://github.com/mycompany/ai-skills \\");
    console.log("    --name company-skills \\");
    console.log("    --branch main \\");
    console.log("    --path skills \\");
    console.log("    --exclude .git,.github,README.md");
    console.log("");
    return;
  }

  const repo = args[0];
  const options = {
    name: null,
    branch: "main",
    path: "skills",
    excludePaths: [],
    skills: [],
  };

  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--name" && args[i + 1]) {
      options.name = args[++i];
    } else if (args[i] === "--branch" && args[i + 1]) {
      options.branch = args[++i];
    } else if (args[i] === "--path" && args[i + 1]) {
      options.path = args[++i];
    } else if (args[i] === "--exclude" && args[i + 1]) {
      options.excludePaths = args[++i].split(',').map(p => p.trim());
    }
  }

  // Generate name if not provided
  if (!options.name) {
    const match = repo.match(/github\.com\/[^/]+\/([^/]+)/);
    options.name = match ? match[1].replace(/\.git$/, "") : "custom-source";
  }

  console.log(`\n➕ Adding source: ${options.name}\n`);
  console.log(`   Repository: ${repo}`);
  console.log(`   Branch: ${options.branch}`);
  console.log(`   Path: ${options.path}`);
  if (options.excludePaths.length > 0) {
    console.log(`   Exclude: ${options.excludePaths.join(', ')}`);
  }
  console.log("");

  const sourceData = {
    name: options.name,
    repo,
    branch: options.branch,
    path: options.path,
    skills: [],
    enabled: true,
  };

  // Add excludePaths if provided
  if (options.excludePaths.length > 0) {
    sourceData.excludePaths = options.excludePaths;
  }

  const result = configManager.addSource(sourceData);

  if (result.added) {
    console.log(`✅ Source "${options.name}" added successfully!`);
    console.log("\n💡 Next steps:");
    console.log(`  1. agentools update --source ${options.name}`);
    console.log("  2. Edit config to specify skills: agentools config edit");
    console.log("");
  } else {
    console.log(`❌ ${result.reason}\n`);
  }
}

function sourceRemove(args) {
  if (args.length === 0) {
    console.log("\n❌ Missing source name");
    console.log("Usage: agentools source remove <name>");
    console.log("\nList sources: agentools source list\n");
    return;
  }

  const name = args[0];
  console.log(`\n🗑️  Removing source: ${name}\n`);

  const result = configManager.removeSource(name);

  if (result.removed) {
    console.log(`✅ Source "${name}" removed successfully!\n`);
  } else {
    console.log(`❌ ${result.reason}\n`);
  }
}

function sourceList() {
  console.log("\n📋 Skill Sources\n");

  const config = configManager.loadConfig();

  console.log("🏢 Official Sources:");
  if (config.sources.official.length === 0) {
    console.log("  (none)");
  } else {
    config.sources.official.forEach((s) => {
      const status = s.enabled === false ? "❌ disabled" : "✅ enabled";
      console.log(`  ${status} ${s.name}`);
      console.log(`    ${s.repo}`);
      console.log(`    ${s.skills.length} skill(s)`);
      console.log("");
    });
  }

  console.log("\n👤 Custom Sources:");
  if (config.sources.custom.length === 0) {
    console.log("  (none)");
    console.log("\n  💡 Add a source: agentools source add <repo-url>");
  } else {
    config.sources.custom.forEach((s) => {
      const status = s.enabled === false ? "❌ disabled" : "✅ enabled";
      console.log(`  ${status} ${s.name}`);
      console.log(`    ${s.repo} (${s.branch})`);
      console.log(`    ${s.skills.length} skill(s)`);
      if (s.metadata?.addedAt) {
        const date = new Date(s.metadata.addedAt).toLocaleDateString();
        console.log(`    Added: ${date}`);
      }
      console.log("");
    });
  }
}

function sourceToggle(args, enable) {
  if (args.length === 0) {
    console.log(`\n❌ Missing source name`);
    console.log(`Usage: agentools source ${enable ? "enable" : "disable"} <name>\n`);
    return;
  }

  const name = args[0];
  const action = enable ? "Enabling" : "Disabling";
  console.log(`\n🔄 ${action} source: ${name}\n`);

  const result = configManager.toggleSource(name, enable);

  if (result.updated) {
    const status = enable ? "enabled" : "disabled";
    console.log(`✅ Source "${name}" ${status} successfully!\n`);
  } else {
    console.log(`❌ ${result.reason}\n`);
  }
}

function sourceInfo(args) {
  if (args.length === 0) {
    console.log("\n❌ Missing source name");
    console.log("Usage: agentools source info <name>\n");
    return;
  }

  const name = args[0];
  const result = configManager.getSourceInfo(name);

  if (!result.found) {
    console.log(`\n❌ ${result.reason}\n`);
    return;
  }

  const s = result.source;
  console.log(`\n📦 Source: ${s.name}\n`);
  console.log(`   Type: ${result.type}`);
  console.log(`   Repository: ${s.repo}`);
  console.log(`   Branch: ${s.branch}`);
  console.log(`   Status: ${s.enabled === false ? "disabled" : "enabled"}`);
  console.log(`   Skills: ${s.skills.length}`);

  if (s.skills.length > 0) {
    console.log("\n   Available skills:");
    s.skills.forEach((skill) => {
      console.log(`     • ${skill.name} (${skill.path})`);
    });
  }

  if (s.metadata) {
    console.log("\n   Metadata:");
    Object.entries(s.metadata).forEach(([key, value]) => {
      console.log(`     ${key}: ${value}`);
    });
  }

  if (s.license) {
    console.log(`\n   License: ${s.license}`);
  }

  if (s.attribution) {
    console.log(`   Attribution: ${s.attribution}`);
  }

  console.log("");
}

// Config Management Commands
function configGet(args) {
  if (args.length === 0) {
    console.log("\n❌ Missing config key");
    console.log("Usage: agentools config get <key>");
    console.log("\nExamples:");
    console.log("  agentools config get version");
    console.log("  agentools config get sync.enabled");
    console.log("  agentools config get preferences.autoUpdate\n");
    return;
  }

  const key = args[0];
  const result = configManager.getConfigValue(key);

  if (result.found) {
    console.log(`\n${key} = ${JSON.stringify(result.value, null, 2)}\n`);
  } else {
    console.log(`\n❌ ${result.reason}\n`);
  }
}

function configSet(args) {
  if (args.length < 2) {
    console.log("\n❌ Missing arguments");
    console.log("Usage: agentools config set <key> <value>");
    console.log("\nExamples:");
    console.log("  agentools config set preferences.autoUpdate true");
    console.log("  agentools config set sync.enabled false\n");
    return;
  }

  const key = args[0];
  let value = args[1];

  // Parse JSON values
  if (value === "true") value = true;
  else if (value === "false") value = false;
  else if (value === "null") value = null;
  else if (value !== "" && !isNaN(value)) value = Number(value);

  console.log(`\n⚙️  Setting ${key} = ${JSON.stringify(value)}\n`);

  const result = configManager.setConfigValue(key, value);

  if (result.updated) {
    console.log("✅ Config updated successfully!\n");
  } else {
    console.log("❌ Failed to update config\n");
  }
}

function configEdit() {
  const configPath = configManager.getConfigPath();
  const editor = process.env.EDITOR || process.env.VISUAL || "nano";

  console.log(`\n📝 Opening config in ${editor}...\n`);
  console.log(`   ${configPath}\n`);

  try {
    execSync(`${editor} "${configPath}"`, { stdio: "inherit" });
    console.log("\n✅ Done editing\n");
  } catch (error) {
    console.log("\n⚠️  Editor closed\n");
  }
}

function configValidate() {
  console.log("\n🔍 Validating config...\n");

  const config = configManager.loadConfig();
  const result = configManager.validateConfig(config);

  if (result.valid) {
    console.log("✅ Config is valid!\n");
  } else {
    console.log("❌ Config has errors:\n");
    result.errors.forEach((err) => {
      console.log(`   • ${err}`);
    });
    console.log("");
  }
}

function configExport(args) {
  const outputPath = args[0] || "agentools.json";

  console.log(`\n📤 Exporting config to: ${outputPath}\n`);

  const result = configManager.exportConfig(outputPath);

  if (result.exported) {
    console.log(`✅ Config exported successfully!`);
    console.log(`\n💡 Share with team: ${path.resolve(outputPath)}\n`);
  } else {
    console.log("❌ Failed to export config\n");
  }
}

function configImport(args) {
  if (args.length === 0) {
    console.log("\n❌ Missing import file");
    console.log("Usage: agentools config import <file> [--merge]\n");
    return;
  }

  const inputPath = args[0];
  const merge = args.includes("--merge");

  console.log(`\n📥 Importing config from: ${inputPath}`);
  console.log(`   Mode: ${merge ? "merge" : "replace"}\n`);

  const result = configManager.importConfig(inputPath, merge);

  if (result.imported) {
    console.log("✅ Config imported successfully!\n");
  } else {
    console.log(`❌ ${result.reason}`);
    if (result.errors) {
      result.errors.forEach((err) => console.log(`   • ${err}`));
    }
    console.log("");
  }
}

function configReset(args) {
  console.log("\n⚠️  This will reset config to defaults. Continue? (y/N) ");

  // Simple confirmation (in production, use readline)
  if (!args.includes("--yes") && !args.includes("-y")) {
    console.log("   Use --yes to confirm\n");
    return;
  }

  console.log("\n🔄 Resetting config...\n");

  configManager.resetConfig();

  console.log("✅ Config reset to defaults!\n");
}

// Installation & Sync Commands
function install(args) {
  console.log("\n📥 Installing skills...\n");

  const options = {
    force: false,
    skill: null,
    sync: true,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--force") {
      options.force = true;
    } else if (args[i] === "--skill" && args[i + 1]) {
      options.skill = args[++i];
    } else if (args[i] === "--no-sync") {
      options.sync = false;
    }
  }

  try {
    const result = installer.install(options);

    if (result.skillsCount > 0 || result.workflowsCount > 0) {
      const parts = [];
      if (result.skillsCount > 0) parts.push(`${result.skillsCount} skill(s)`);
      if (result.workflowsCount > 0) parts.push(`${result.workflowsCount} workflow(s)`);

      // Count MCP servers across all platforms
      let mcpTotal = 0;
      result.details.forEach((d) => {
        if (d.mcpServers) mcpTotal += d.mcpServers.added + d.mcpServers.skipped;
      });
      if (mcpTotal > 0) parts.push(`${mcpTotal} MCP server(s)`);

      console.log(`\n✓ Installed ${parts.join(", ")} to ${result.platformsCount} platform(s)\n`);
      result.details.forEach((d) => {
        console.log(`  ${d.platform}:`);
        if (d.skills.length > 0) {
          console.log(`    Skills: ${d.skillsPath}`);
          d.skills.forEach((s) => {
            const status = s.skipped > 0 ? `(${s.copied} new, ${s.skipped} skipped)` : "";
            console.log(`      • ${s.name} ${status}`);
          });
        }
        if (d.workflows.length > 0) {
          console.log(`    Workflows: ${d.workflowsPath}`);
          d.workflows.forEach((w) => {
            const status = w.skipped > 0 ? "(skipped)" : "";
            console.log(`      • ${w.name} ${status}`);
          });
        }
        if (d.mcpServers && d.mcpServers.servers.length > 0) {
          console.log(`    MCP Servers: ${d.mcpServers.added} added, ${d.mcpServers.skipped} skipped`);
          d.mcpServers.servers.forEach((name) => {
            console.log(`      • ${name}`);
          });
        }
      });

      // Hint about secrets sync if MCP servers were installed
      if (mcpTotal > 0) {
        console.log("\n💡 Run 'agentools secrets sync' to resolve Bitwarden secrets");
      }
    } else {
      console.log("\n⚠️  No skills or workflows installed.");
    }
  } catch (error) {
    console.error(`\n❌ Installation failed: ${error.message}`);
    process.exit(1);
  }

  console.log("");
}

function update(args) {
  console.log("\n🔄 Updating skills from all sources...\n");

  const options = {
    source: null,
    skill: null,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--source" && args[i + 1]) {
      options.source = args[++i];
    } else if (args[i] === "--skill" && args[i + 1]) {
      options.skill = args[++i];
    }
  }

  try {
    const SyncManager = require("../scripts/sync-manager");
    const config = configManager.loadConfig();
    const syncManager = new SyncManager(config);

    // 1. Pull latest from repository first
    console.log("📥 Pulling latest from repository...\n");
    const pullResult = syncManager.pull();
    if (pullResult.pulled) {
      console.log("   ✓ Repository up to date\n");
    } else {
      console.log(`   ⊗ Pull: ${pullResult.reason || "failed"}\n`);
    }

    // 2. Sync external skills
    const result = externalSync.syncAll(options);

    console.log(`\n✓ Updated from ${result.synced} source(s)`);
    console.log(`  Copied: ${result.copied} skill(s)`);
    console.log(`  Skipped: ${result.skipped} skill(s)`);
    if (result.failed > 0) {
      console.log(`  Failed: ${result.failed} source(s)`);
    }

    // 3. Push changes to repository
    if (result.copied > 0) {
      console.log("\n📤 Pushing synced skills to repository...\n");

      const skillNames = options.skill || "external skills";
      const message = `chore: sync ${skillNames} from external sources`;

      const pushResult = syncManager.push({ message });
      if (pushResult.pushed) {
        console.log("   ✓ Pushed to repository");
      } else {
        console.log(`   ⊗ ${pushResult.reason}`);
      }
    }

    // 4. Auto-install
    console.log("\n📥 Auto-installing skills + MCP servers...\n");
    install(["--force", "--no-sync"]);

    console.log("");
  } catch (error) {
    console.error(`\n❌ Update failed: ${error.message}`);
    console.log("\n💡 Try running: agentools init");
    process.exit(1);
  }
}

/**
 * Push skills to GitHub repository
 */
function push(args) {
  console.log("\n⬆️  Pushing to GitHub...\n");

  const config = configManager.loadConfig();

  if (!config.repository.url) {
    console.error("❌ No repository configured");
    console.log("\n   Run: agentools init --repo <url>\n");
    process.exit(1);
  }

  const SyncManager = require("../scripts/sync-manager");
  const syncManager = new SyncManager(config);

  const options = {
    message: getArgValue(args, "--message") || "Update skills and workflows",
  };

  try {
    const result = syncManager.push(options);

    if (result.pushed) {
      console.log("✅ Pushed successfully!");
      console.log(`   Repository: ${config.repository.url}\n`);
    } else {
      console.log(`⚠️  ${result.reason}`);

      if (result.conflicts && result.conflicts.length > 0) {
        console.log("\n   Conflicting files:");
        result.conflicts.forEach((f) => console.log(`     - ${f}`));
        console.log("\n   Resolve conflicts manually and try again.\n");
        process.exit(1);
      }
    }
  } catch (error) {
    console.error(`❌ Push failed: ${error.message}\n`);
    process.exit(1);
  }
}

/**
 * Pull skills from GitHub repository
 */
function pull(args) {
  console.log("\n⬇️  Pulling from GitHub...\n");

  const config = configManager.loadConfig();

  if (!config.repository.url) {
    console.error("❌ No repository configured");
    console.log("\n   Run: agentools init <url>\n");
    process.exit(1);
  }

  const SyncManager = require("../scripts/sync-manager");
  const syncManager = new SyncManager(config);

  try {
    const result = syncManager.pull();

    if (result.pulled) {
      console.log("✅ Pulled successfully!\n");

      // Auto-install after pull (unless --no-install flag)
      const noInstall = args.includes("--no-install");

      if (!noInstall) {
        console.log("📥 Auto-installing skills + MCP servers...\n");
        install(["--force"]); // Force install to ensure latest
      }
    } else {
      console.log(`⚠️  ${result.reason || "Pull failed"}`);

      if (result.conflicts && result.conflicts.length > 0) {
        console.log("\n   Conflicts in:");
        result.conflicts.forEach((f) => console.log(`     - ${f}`));
        console.log("\n   Resolve manually and commit.\n");
        process.exit(1);
      }
    }
  } catch (error) {
    console.error(`❌ Pull failed: ${error.message}\n`);
    process.exit(1);
  }
}


function uninstall(args) {
  console.log("\n🗑️  Uninstalling skills...\n");

  const options = {
    platform: null,
    skill: null,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--platform" && args[i + 1]) {
      options.platform = args[++i];
    } else if (args[i] === "--skill" && args[i + 1]) {
      options.skill = args[++i];
    }
  }

  try {
    const result = installer.uninstall(options);

    if (result.totalRemoved > 0) {
      console.log(`✓ Removed ${result.totalRemoved} skill(s) from ${result.platformsCount} platform(s)\n`);
      result.details.forEach((d) => {
        if (d.removed > 0) {
          console.log(`  ${d.platform}: ${d.removed} removed`);
        }
      });
    } else {
      console.log("ℹ️  No skills to remove.");
    }
  } catch (error) {
    console.error(`\n❌ Uninstall failed: ${error.message}`);
    process.exit(1);
  }

  console.log("");
}

function listExternal() {
  try {
    externalSync.list();
  } catch (error) {
    console.error(`\n❌ List failed: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Sync secrets from Bitwarden
 */
async function secretsSync() {
  try {
    await secretManager.syncSecrets();
  } catch (error) {
    console.error(`\n❌ Secrets sync failed: ${error.message}`);
    process.exit(1);
  }
}

// Main
(async () => {
  const args = process.argv.slice(2);
  const command = args[0];
  const subcommand = args[1];

  // Handle multi-word commands
  if (command === "source") {
    switch (subcommand) {
      case "add":
        sourceAdd(args.slice(2));
        break;
      case "remove":
        sourceRemove(args.slice(2));
        break;
      case "list":
        sourceList(args.slice(2));
        break;
      case "enable":
        sourceToggle(args.slice(2), true);
        break;
      case "disable":
        sourceToggle(args.slice(2), false);
        break;
      case "info":
        sourceInfo(args.slice(2));
        break;
      default:
        console.error(`Unknown source command: ${subcommand}`);
        console.log('Run "agentools help" for usage information.');
        process.exit(1);
    }
  } else if (command === "config") {
    switch (subcommand) {
      case "get":
        configGet(args.slice(2));
        break;
      case "set":
        configSet(args.slice(2));
        break;
      case "edit":
        configEdit(args.slice(2));
        break;
      case "validate":
        configValidate(args.slice(2));
        break;
      case "export":
        configExport(args.slice(2));
        break;
      case "import":
        configImport(args.slice(2));
        break;
      case "reset":
        configReset(args.slice(2));
        break;
      default:
        console.error(`Unknown config command: ${subcommand}`);
        console.log('Run "agentools help" for usage information.');
        process.exit(1);
    }
  } else if (command === "secrets") {
    switch (subcommand) {
      case "sync":
        await secretsSync();
        break;
      default:
        console.error(`Unknown secrets command: ${subcommand}`);
        console.log('Run "agentools help" for usage information.');
        process.exit(1);
    }
  } else {
    // Single-word commands
    switch (command) {
      case "init":
        init(args.slice(1));
        break;
      case "migrate":
        migrateCmd(args.slice(1));
        break;
      case "push":
        push(args.slice(1));
        break;
      case "pull":
        pull(args.slice(1));
        break;
      case "update":
        update(args.slice(1));
        break;

      case "sync-external":
        // Backward compatibility - alias for update
        update(args.slice(1));
        break;
      case "list":
        listSkills();
        break;
      case "list-external":
        listExternal(args.slice(1));
        break;
      case "platforms":
        showPlatforms();
        break;
      case "uninstall":
        uninstall(args.slice(1));
        break;
      case "version":
      case "--version":
      case "-v":
        console.log(`v${VERSION}`);
        break;
      case "help":
      case "--help":
      case "-h":
      case undefined:
        showHelp();
        break;
      default:
        console.error(`Unknown command: ${command}`);
        console.log('Run "agentools help" for usage information.');
        process.exit(1);
    }
  }
})();

