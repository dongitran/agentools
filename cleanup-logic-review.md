# Review of `.agentools-managed` Auto-Cleanup Logic

Based on the review of `package/scripts/installer.js` (specifically the `installSkills` function), there are a few edge cases where the auto-cleanup logic could lead to unintended deletions, failure to clean up, or process crashes.

## 1. Custom Skill Accidental Deletion (False Positives)

*   **The `DEPRECATED_SKILLS` Hardcode**: 
    ```javascript
    const DEPRECATED_SKILLS = ["subagent-launcher", "subagent-resolution"];
    if (fs.existsSync(managedMarker) || DEPRECATED_SKILLS.includes(dirName)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
    }
    ```
    **Edge Case:** If a user independently creates a custom, unmanaged skill and happens to name it `subagent-launcher` or `subagent-resolution`, it will be **forcefully deleted**. The condition `|| DEPRECATED_SKILLS.includes(dirName)` bypasses the `.agentools-managed` check entirely, making those directory names permanently unsafe for users to use for their own custom skills.

## 2. Orphaned Skills Failing to Delete (False Negatives)

*   **Missing `.agentools-managed` Marker**: 
    If a user (or another process) accidentally deletes the `.agentools-managed` empty file inside a managed skill, and that skill is later removed from upstream (becoming orphaned), the cleanup logic will ignore it. The orphaned skill will persist in the platform directory forever because it lacks the marker.
*   **Symlinked Directories**:
    ```javascript
    const existingDirs = fs.readdirSync(skillsPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
    ```
    **Edge Case:** `dirent.isDirectory()` returns `false` for symlinks. If a user sets up a symlink inside their platform skills directory (e.g., `ln -s ~/my-skills/xyz ~/.claude/skills/xyz`), and that symlink contains a `.agentools-managed` file, the script will completely ignore it. It won't be evaluated for cleanup.

## 3. Potential for Process Crashes (Lack of Error Handling)

*   **Uncaught Exceptions in `fs.rmSync`**:
    ```javascript
    fs.rmSync(dirPath, { recursive: true, force: true });
    ```
    **Edge Case:** The removal is not wrapped in a `try...catch` block. If a file inside the orphaned skill is currently locked by another process (e.g., an IDE, an actively running AI agent, or a restrictive permission set), `fs.rmSync` will throw an error. This will **crash the entire `install` loop**, preventing remaining skills, agents, and workflows from being installed or updated.
    *(Note: In the `uninstallFromPlatform` function on line 614, `fs.rmSync` uses `{ maxRetries: 3, retryDelay: 100 }` to mitigate locking issues, but the cleanup logic in `installSkills` omits these robust options).*

## 4. Name Collisions (Skills vs. Workflows)

*   **Shared Namespace**: 
    ```javascript
    const allManagedToKeep = [...skillsToInstall, ...workflowsToKeep];
    ```
    **Edge Case:** Since skills and workflows share the `allManagedToKeep` list, if an upstream skill is deleted (orphaned) but a *workflow* with the exact same name is created, the orphaned skill directory will survive the `installSkills` cleanup phase. Depending on the platform config (`workflowsAsSkills`), it might be overwritten by the workflow later, or it might just sit there as a stale hybrid directory.
