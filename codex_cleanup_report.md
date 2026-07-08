# Report: Agent Auto-Cleanup Logic for Codex

## Overview
The user requested a review of the agent auto-cleanup logic in `package/scripts/installer.js` (specifically the `installAgents` function) and how it interacts with Codex `.toml` files during a `pull` command.

The goal is to determine whether the `pull` command correctly removes obsolete Codex agents from both the filesystem and the `~/.codex/config.toml` file.

## Findings

### 1. Does it remove obsolete Codex agents from the filesystem?
**No.**

In `package/scripts/installer.js` (`installAgents`), the auto-cleanup logic looks for obsolete agents by reading the `agentsPath` directory and filtering specifically for **directories**:

```javascript
    // Cleanup orphaned managed agents
    const existingDirs = fs.readdirSync(agentsPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
```

However, as defined in `package/scripts/platforms.js` under the `codex` platform hook `onAgentInstalled`, Codex agents are converted to `.toml` files, and the original directory is explicitly deleted:

```javascript
            context.fs.writeFileSync(targetTomlPath, context.toml.stringify(codexConfig), "utf-8");
            
            // Clean up the copied agent folder as Codex expects individual files, not directories
            context.fs.rmSync(destPath, { recursive: true, force: true });
```

Because Codex stores agents as individual `.toml` files (e.g., `~/.codex/agents/my-agent.toml`) instead of directories, the `.isDirectory()` filter in the cleanup logic completely ignores them. As a result, the obsolete `.toml` files are left behind on the filesystem.

*(Note: The `uninstall` function in `installer.js` handles this correctly by explicitly checking for and removing `${agentName}.toml`, but `installAgents` during a pull does not).*

### 2. Does it remove obsolete Codex agents from `~/.codex/config.toml`?
**No.**

The interaction with `config.toml` is handled via platform hooks:
- `preInstallAgents`: Reads `config.toml` and returns the `platformConfig` object.
- `onAgentInstalled`: Mutates the `platformConfig` by adding or updating the installed agent (e.g., `platformConfig.agents[agentName] = {...}`).
- `postInstallAgents`: Writes the mutated `platformConfig` back to `config.toml`.

There is no logic in `installAgents` or the platform hooks to identify and delete agents from `platformConfig` that are no longer present in the `agentsToInstall` list. The obsolete agents are simply carried over from the initial read in `preInstallAgents` and written back out in `postInstallAgents`.

## Summary
The current auto-cleanup implementation fails for Codex on both fronts:
1. Obsolete `~/.codex/agents/*.toml` files are ignored during cleanup because the logic only targets directories.
2. Obsolete agent entries are never removed from `~/.codex/config.toml` because the hooks only perform additions/updates, and lack a mechanism to delete removed agents.
