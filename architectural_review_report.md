# Architectural Review: Agents Syncing & Installation Logic

I have reviewed the modifications in `package/scripts/external-sync.js`, `package/scripts/installer.js`, `package/scripts/platforms.js`, and `package/bin/cli.js`.

Overall, the new `agents` cloning and syncing logic fits very well with the existing `agentools` implementation. You have successfully mirrored the established paradigms for `skills` and `workflows`. 

However, there are a few minor architectural inconsistencies and omissions to be aware of:

## 1. Uninstall Logic Leaves Ghost Agents (`installer.js`)
Currently, `uninstallFromPlatform` successfully removes skills and workflows from `platform.skillsPath`. However, it does not clean up `platform.agentsPath`. If a user runs `agentools uninstall`, the agents will be left behind in the target platform's agents directory.
**Recommendation**: Update `uninstallFromPlatform` to iterate through `platform.agentsPath` and remove the installed agents, similar to how it handles `skillsPath`.

## 2. Missing `ensureAgentsDir` Utility (`platforms.js` / `installer.js`)
For skills and workflows, `platforms.js` exposes utility functions like `ensureSkillsDir(platform)` and `ensureWorkflowsDir(platform)`.
In `installer.js`, the directory creation for agents is done inline:
```javascript
if (platform.agentsPath) {
  if (!fs.existsSync(platform.agentsPath)) {
    fs.mkdirSync(platform.agentsPath, { recursive: true });
  }
  agents = installAgents(platform.agentsPath, options);
}
```
**Recommendation**: For architectural consistency, add `ensureAgentsDir(platform)` to `platforms.js` and use it inside `installToPlatform()`.

## 3. Lack of Granular Filtering for Agents
In both `installer.js` and `external-sync.js`, there is support for filtering by a specific skill using the `--skill` flag (`options.skill`). 
However, there is no equivalent `--agent` flag, and the logic unconditionally installs/syncs all agents. If a user runs `agentools update --skill my-skill`, all agents will still be forcefully synced alongside that single skill.
**Recommendation**: If granular agent syncing is desired, add an `options.agent` filter in `cli.js`, `installer.js`, and `external-sync.js`.

## 4. Platform Support Constraints (`platforms.js`)
You added `agentsDir` and `get agentsPath()` to **Claude Code** and **Codex CLI**. Other platforms (e.g., Cursor, Windsurf, Antigravity) do not have this defined. 
*Note: This is not an error if those platforms natively do not support an `agents/` directory, but it is worth noting just in case you intended for agents to be universally copied to all platforms.*

## Summary of the Good Parts
- **Constants:** `PACKAGE_AGENTS_DIR`, `REPO_AGENTS_DIR`, and `getUserRepoAgentsDir()` perfectly match the `skills` and `workflows` patterns.
- **Config Management:** Your fallback paths in `external-sync.js` appropriately leverage `config.repository.local` with a fallback to `~/.agentools/agents`.
- **CLI Logging:** The counts for agents copied, skipped, and failed during `syncAll` and `install` blend perfectly into the existing console output formatting.
