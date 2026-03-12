/**
 * Migration Module
 * Handles migration from v1.x to v2.0
 */

const fs = require("fs");
const path = require("path");
const configManager = require("./config-manager");

/**
 * Check if migration is needed
 */
function needsMigration() {
  // If user config already exists, no migration needed
  return !configManager.configExists();
}

/**
 * Migrate from v1 to v2
 */
function migrate(options = {}) {
  const { silent = false } = options;

  if (!needsMigration()) {
    if (!silent) {
      console.log("ℹ️  Already on v2.0 or config exists");
    }
    return { migrated: false, reason: "Already migrated or config exists" };
  }

  if (!silent) {
    console.log("\n🔄 Migrating to v2.0...\n");
  }

  // Initialize config with defaults
  const result = configManager.initConfig();

  if (result.created) {
    if (!silent) {
      console.log("✅ Migration complete!");
      console.log(`   Config created: ${result.path}\n`);
      console.log("💡 What's new in v2.0:");
      console.log("   • User config file in ~/.agentools/config.json");
      console.log("   • Add custom skill sources: agentools source add <repo>");
      console.log("   • Manage config: agentools config get/set");
      console.log("   • Export/import: agentools config export/import");
      console.log("\n📚 Run 'agentools --help' to see all new commands\n");
    }

    return { migrated: true, configPath: result.path };
  } else {
    return { migrated: false, reason: result.reason };
  }
}

/**
 * Auto-migrate on first run
 */
function autoMigrate() {
  if (needsMigration()) {
    return migrate({ silent: false });
  }
  return { migrated: false, reason: "No migration needed" };
}

module.exports = {
  needsMigration,
  migrate,
  autoMigrate,
};
