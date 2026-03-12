/**
 * AI Agent Config
 * Universal Global Skills & Workflows for AI Coding Assistants
 *
 * @module agentools
 */

const platforms = require("./scripts/platforms");
const installer = require("./scripts/installer");

module.exports = {
  // Platform detection
  platforms: {
    detectAll: platforms.detectAll,
    getByName: platforms.getByName,
    getAllNames: platforms.getAllNames,
    SUPPORTED: platforms.SUPPORTED,
  },

  // Installation
  installer: {
    install: installer.install,
    uninstall: installer.uninstall,
    syncRepo: installer.syncRepo,
    isRepoCached: installer.isRepoCached,
    getAvailableSkills: installer.getAvailableSkills,
    getAvailableWorkflows: installer.getAvailableWorkflows,
  },

  // Constants
  REPO_URL: installer.REPO_URL,
  CACHE_DIR: installer.CACHE_DIR,

  // Version
  version: require("./package.json").version,
};

