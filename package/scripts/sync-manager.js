/**
 * Sync Manager Module
 * Handles pushing/pulling skills to/from GitHub repository
 */

const fs = require("fs");
const path = require("path");
const { execSync, spawnSync } = require("child_process");

const GIT_OPERATION_TIMEOUT_MS = 120000;
const GIT_OPERATION_MAX_ATTEMPTS = 2;

class SyncManager {
    constructor(config) {
        this.config = config;
        this.repoPath = this.expandPath(config.repository.local);
    }

    /**
     * Push local changes to GitHub
     */
    push(options = {}) {
        if (!this.config.repository.url) {
            return { pushed: false, reason: "No repository configured" };
        }

        // 1. Check if repo exists locally
        if (!fs.existsSync(this.repoPath)) {
            return { pushed: false, reason: `Repository not found at ${this.repoPath}` };
        }

        // 2. Check for local changes
        if (!this.hasLocalChanges()) {
            return { pushed: false, reason: "No changes to push" };
        }

        // 3. Auto-sync: pull before push (if enabled)
        if (this.config.repository.autoSync) {
            console.log("🔄 Auto-syncing from remote...");
            const pullResult = this.pull();

            if (!pullResult.pulled) {
                return {
                    pushed: false,
                    reason: "Pull failed before push",
                    conflicts: pullResult.conflicts,
                };
            }
        }

        // 4. Commit and push
        try {
            const message = options.message || "Update skills and workflows";
            this.gitCommit(message);
            this.gitPush();

            // Update last sync time
            this.updateLastSync();

            return { pushed: true };
        } catch (error) {
            return { pushed: false, reason: error.message };
        }
    }

    /**
     * Pull from GitHub to local
     */
    pull() {
        if (!this.config.repository.url) {
            throw new Error("No repository configured");
        }

        if (!fs.existsSync(this.repoPath)) {
            throw new Error(`Repository not found at ${this.repoPath}`);
        }

        try {
            const output = this.runGitCommandWithRetry("git pull", {
                cwd: this.repoPath,
                encoding: "utf-8",
            });

            // Check for conflicts
            if (output.includes("CONFLICT")) {
                const conflicts = this.parseConflicts(output);
                return { pulled: false, conflicts };
            }

            this.updateLastSync();
            return { pulled: true };
        } catch (error) {
            // Check if error message contains conflict info
            const errorMsg = this.getGitErrorMessage(error);
            if (errorMsg.includes("CONFLICT")) {
                const conflicts = this.parseConflicts(errorMsg);
                return { pulled: false, conflicts };
            }
            return { pulled: false, reason: error.message };
        }
    }

    /**
     * Bi-directional sync (pull + push)
     */
    sync(options = {}) {
        // Pull first
        const pullResult = this.pull();
        if (!pullResult.pulled) {
            return {
                synced: false,
                reason: "Pull failed",
                conflicts: pullResult.conflicts,
            };
        }

        // Then push
        const pushResult = this.push(options);
        if (!pushResult.pushed) {
            return {
                synced: false,
                reason: pushResult.reason,
            };
        }

        return { synced: true };
    }

    /**
     * Check if local has uncommitted changes
     */
    hasLocalChanges() {
        try {
            const status = execSync("git status --porcelain", {
                cwd: this.repoPath,
                encoding: "utf-8",
            });
            return status.trim().length > 0;
        } catch (error) {
            return false;
        }
    }

    /**
     * Check for remote changes (potential conflicts)
     */
    checkRemoteConflicts() {
        try {
            // Fetch remote
            execSync("git fetch", { cwd: this.repoPath, stdio: "pipe" });

            const branch = this.config.repository.branch || "main";

            // Compare local vs remote
            const diffResult = spawnSync("git", ["diff", "HEAD", `origin/${branch}`, "--name-only"], {
                cwd: this.repoPath,
                encoding: "utf-8",
            });
            const diff = diffResult.stdout || "";

            return diff.trim().split("\n").filter(Boolean);
        } catch (error) {
            return [];
        }
    }

    /**
     * Git commit
     */
    gitCommit(message) {
        try {
            // Add all .agents/ files except bundled package skills
            execSync("git add .agents/workflows/", { cwd: this.repoPath, stdio: "pipe" });

            // Add MCP servers
            const mcpServersDir = path.join(this.repoPath, ".agents/mcp-servers");
            if (fs.existsSync(mcpServersDir)) {
                execSync("git add .agents/mcp-servers/", { cwd: this.repoPath, stdio: "pipe" });
            }

            // Add Global Rules
            const rulesDir = path.join(this.repoPath, ".agents/rules");
            if (fs.existsSync(rulesDir)) {
                execSync("git add .agents/rules/", { cwd: this.repoPath, stdio: "pipe" });
            }

            // Add skills individually, excluding bundled ones
            const skillsDir = path.join(this.repoPath, ".agents/skills");
            const bundledSkills = ["agentools", "config-manager"];

            if (fs.existsSync(skillsDir)) {
                const skills = fs.readdirSync(skillsDir);
                skills.forEach(skill => {
                    if (!bundledSkills.includes(skill)) {
                        spawnSync("git", ["add", `.agents/skills/${skill}`], {
                            cwd: this.repoPath,
                            stdio: "pipe"
                        });
                    }
                });
            }

            const commitResult = spawnSync("git", ["commit", "-m", message], { cwd: this.repoPath, stdio: "pipe" });
            if (commitResult.status !== 0) {
                const output = (commitResult.stdout?.toString() || "") + (commitResult.stderr?.toString() || "");
                if (!output.includes("nothing to commit")) {
                    throw new Error(output || "git commit failed");
                }
            }
        } catch (error) {
            // Ignore commit errors if nothing to commit
            if (!error.message.includes("nothing to commit")) {
                throw error;
            }
        }
    }

    /**
     * Git push
     */
    gitPush() {
        const branch = this.config.repository.branch || "main";
        const result = spawnSync("git", ["push", "origin", branch], { cwd: this.repoPath, stdio: "inherit" });
        if (result.status !== 0) {
            throw new Error("git push failed");
        }
    }

    runGitCommandWithRetry(command, options = {}) {
        let lastError = null;

        for (let attempt = 1; attempt <= GIT_OPERATION_MAX_ATTEMPTS; attempt++) {
            try {
                return execSync(command, {
                    ...options,
                    timeout: GIT_OPERATION_TIMEOUT_MS,
                });
            } catch (error) {
                lastError = error;
                const message = this.getGitErrorMessage(error);
                if (!this.isRetryableGitError(error)) {
                    throw error;
                }
                const retryText = attempt < GIT_OPERATION_MAX_ATTEMPTS ? " Retrying..." : "";
                console.error(`Git command attempt ${attempt}/${GIT_OPERATION_MAX_ATTEMPTS} failed: ${message}.${retryText}`);
            }
        }

        throw lastError;
    }

    isRetryableGitError(error) {
        return !this.getGitErrorMessage(error).includes("CONFLICT");
    }

    getGitErrorMessage(error) {
        const output = [error.stdout, error.stderr]
            .filter(Boolean)
            .map((value) => value.toString().trim())
            .filter(Boolean)
            .join("\n");

        if (error.code === "ETIMEDOUT" || error.signal === "SIGTERM") {
            return `timed out after ${GIT_OPERATION_TIMEOUT_MS / 1000}s`;
        }

        return output || error.message;
    }

    /**
     * Update last sync timestamp
     */
    updateLastSync() {
        const configManager = require("./config-manager");
        configManager.setConfigValue("repository.lastSync", new Date().toISOString());
    }

    /**
     * Parse git conflicts
     */
    parseConflicts(output) {
        const lines = output.split("\n");
        return lines
            .filter((line) => line.includes("CONFLICT"))
            .map((line) => line.replace("CONFLICT (content): Merge conflict in ", "").trim())
            .filter(Boolean);
    }

    /**
     * Expand ~ to home directory
     */
    expandPath(p) {
        if (!p) return null;
        return p.replace(/^~/, process.env.HOME || process.env.USERPROFILE);
    }
}

SyncManager.GIT_OPERATION_TIMEOUT_MS = GIT_OPERATION_TIMEOUT_MS;
SyncManager.GIT_OPERATION_MAX_ATTEMPTS = GIT_OPERATION_MAX_ATTEMPTS;

module.exports = SyncManager;
