# Analysis of `agentools pull` Race Conditions

If a user runs `agentools pull` twice in rapid succession in two different terminals, they will trigger a series of operations that are **not protected by application-level locking**. 

Here is what happens to each subsystem and the potential for corruption:

## 1. Git Operations (`sync-repo`)
When `pull` is executed, it delegates to `syncManager.pull()`, which runs `git pull` synchronously in the local `~/.agentools/sync-repo` directory.
- **What happens:** `git` uses its own internal `.git/index.lock` to prevent concurrent modifications. When Terminal A starts `git pull`, it acquires the lock. Terminal B will likely fail with a *"Another git process seems to be running"* error.
- **Mitigation in code:** `syncManager` has a retry mechanism (`runGitCommandWithRetry`) that retries non-conflict errors up to 2 times. If Terminal A finishes quickly, Terminal B will retry and succeed. If Terminal A takes too long, Terminal B will fail the pull and exit cleanly.
- **Corruption risk:** **Low**. Git's own locking protects the `sync-repo` from corruption.

## 2. File Copies (Target Skills/Workflows Directories)
After a successful pull, `agentools pull` automatically invokes the `install(["--force", "--no-sync"])` command. Both terminals will begin synchronizing files from the `sync-repo` to the target platforms (e.g., `~/.claude/skills/`).
- **What happens:** The `copyDir()` function recursively iterates through directories and uses `fs.copyFileSync(src, dest)` to copy files. `force` is set to `true`, so it overwrites existing files.
- **Corruption risk:** **High**. `fs.copyFileSync` is not strictly atomic across all OSes. If both terminals attempt to copy and overwrite the exact same destination file at the exact same millisecond:
  - Process A opens the file with `O_TRUNC` (size becomes 0).
  - Process B opens the file with `O_TRUNC` (size becomes 0).
  - Both processes write to the file.
  - This can lead to interleaved writes, corrupted skill markdown files, or race conditions where one process tries to read/write while the other has an exclusive lock (on Windows, this might crash with `EBUSY` or `EPERM`).
- **Cleanup Phase:** In `installSkills`, orphaned skills are deleted via `fs.rmSync(dirPath, { recursive: true, force: true })`. If Terminal A and Terminal B run this simultaneously, `force: true` handles `ENOENT` gracefully if the other already deleted it, but race conditions during directory traversal could still throw exceptions.

## 3. Configuration Files (`config.json` and `mcp_config.json`)
The CLI frequently reads, modifies, and writes JSON files:
- `syncManager.updateLastSync()` updates `~/.agentools/config.json`.
- `mcpInstaller.installMcpServers()` updates platform-specific MCP configurations (e.g., `~/.claude.json`).
- **What happens:** The code follows a Read-Modify-Write pattern using `fs.readFileSync` followed by `fs.writeFileSync`.
- **Corruption risk:** **High**. If both terminals read the JSON simultaneously, modify it, and write it back using `fs.writeFileSync`:
  - Changes from one process could overwrite changes from the other (lost updates).
  - `fs.writeFileSync` is not atomic. If Process A writes while Process B truncates and writes, it can leave behind malformed, truncated, or interleaved JSON, entirely breaking the CLI or the AI assistant's MCP configuration until manually fixed.
  - `saveConfig()` also attempts to create a backup using `fs.copyFileSync(CONFIG_FILE, backupPath)` before writing, which adds another layer of race condition vulnerability.

## Summary
While the `sync-repo` itself is safe due to Git's native locking, the **target skills directories and JSON configuration files are highly vulnerable to corruption**. 

**Recommendation:** Implement an application-level file lock (e.g., using a `.agentools/sync.lock` file or a package like `proper-lockfile`) wrapping the entirety of the `pull` and `install` flows to guarantee sequential execution.
