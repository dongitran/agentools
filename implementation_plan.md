# Antigravity CLI Integration Plan

## Objective

Add first-class Antigravity CLI (`agy`) support to agentools without conflating it with the existing Antigravity IDE integration. The implementation must install every compatible agentools asset to the paths Antigravity CLI actually reads, work on macOS, Linux, and Windows, remain backward compatible, and ship as a verified npm minor release.

## Research Findings

### Current agentools execution flow

1. `package/bin/cli.js` routes `pull`, `update`, and installation-related commands into `package/scripts/installer.js`.
2. `package/scripts/platforms.js` owns platform identity, detection, skill paths, workflow paths, MCP paths, and global-rule paths.
3. `installer.js` discovers bundled and cached skills/workflows, installs them for every platform returned by `detectAll()`, delegates MCP writes to `mcp-installer.js`, and delegates global rules to `rules-installer.js`.
4. `mcp-installer.js` is metadata-driven: any detected platform with `mcpConfigPath` receives JSON or TOML MCP configuration while preserving existing keys.
5. `rules-installer.js` is metadata-driven: folder-based platforms receive individual rule files and file-based platforms receive a merged managed file.
6. `agentools platforms` exposes the result of `detectAll()`, while `uninstall` uses the same platform registry to remove managed skill directories.

### Antigravity CLI filesystem contract

The implementation is based on Google Antigravity's current official documentation and installer scripts:

- Global skills: `~/.gemini/antigravity-cli/skills/<skill>/SKILL.md`.
- Workspace skills: `<workspace>/.agents/skills/`.
- Global rules/context: `~/.gemini/GEMINI.md`; this is intentionally shared with Antigravity IDE.
- Global MCP config: `~/.gemini/antigravity-cli/mcp_config.json`.
- Workspace MCP config: `<workspace>/.agents/mcp_config.json`.
- Antigravity CLI has no documented standalone global workflow directory. Skills become slash commands, so agentools workflow markdown must be converted to `skills/<workflow>/SKILL.md` as it already is for Claude Code.
- Default binary location on macOS/Linux: `~/.local/bin/agy`.
- Default binary location on Windows: `%LOCALAPPDATA%\agy\bin\agy.exe`.
- The configuration path remains under the user's home directory on every operating system. On Windows, `~/.gemini/antigravity-cli/skills` resolves to `%USERPROFILE%\.gemini\antigravity-cli\skills`.

Primary references:

- https://antigravity.google/docs/gcli-migration
- https://antigravity.google/docs/cli-plugins
- https://github.com/google-antigravity/antigravity-cli
- https://antigravity.google/cli/install.sh
- https://antigravity.google/cli/install.ps1

## Implementation Steps

### 1. Add tests before production code

Update the existing Node test suites first so the required behavior fails against the current implementation:

- `package/test/platforms.test.js`
  - Require `antigravity-cli` in the supported platform registry.
  - Assert the CLI config, skills, MCP, and shared rules paths.
  - Assert workflows are represented as skills.
  - Detect the CLI from its config directory and the default Unix binary location.
  - Ensure a generic `~/.gemini` directory or the CLI directory alone no longer falsely detects Antigravity IDE.
- `package/test/installer.test.js`
  - Install a normal skill to the CLI skills directory.
  - Convert workflow markdown into `<skills>/<workflow>/SKILL.md` for the CLI.
  - Report the real workflow destination as the skills directory.
  - Remove agentools-managed workflows during full CLI uninstall.
- `package/test/mcp-installer.test.js`
  - Install MCP definitions into the CLI-specific `mcp_config.json` and preserve its JSON schema.
- `package/test/rules-installer.test.js`
  - Verify detected Antigravity CLI installs merged global rules into the shared `~/.gemini/GEMINI.md` file.
- `package/test/e2e-cli.test.js`
  - Verify `agentools platforms` displays Antigravity CLI and its global skills path in an isolated home.

Run the focused tests and record that they fail for the expected missing-platform behavior before implementation.

### 2. Extend platform metadata and detection

Modify `package/scripts/platforms.js`:

- Add `antigravity-cli` with display name `Antigravity CLI`.
- Set `configDir` to `.gemini/antigravity-cli`, `skillsDir` to `skills`, MCP config to `mcp_config.json`, file-based rules to the shared `~/.gemini/GEMINI.md`, and workflow conversion metadata.
- Detect an initialized CLI via its config directory.
- Detect an installed but not-yet-initialized CLI via the official default binary path or an `agy`/`agy.exe` binary already present on `PATH`.
- Tighten Antigravity IDE detection to its own config directory or application bundle. A bare `.gemini` directory is shared by multiple Google tools and is not sufficient evidence that the IDE is installed.
- Keep all path construction based on `os.homedir()`/`path.join()` so Windows receives native separators automatically.

### 3. Make workflow installation capability-driven

Modify `package/scripts/installer.js`:

- Replace the Claude-only workflow branch with platform metadata (`workflowsAsSkills`).
- For such platforms, use the skills path as the reported and actual workflow destination and do not create a misleading unused native workflow directory.
- Preserve the existing native workflow copy behavior for Antigravity IDE.
- Include converted workflow names in full uninstall for platforms that install workflows as skills, preventing orphaned agentools content.

No separate workflow abstraction or new module will be introduced; the existing conversion function already owns this responsibility.

### 4. Validate delegated MCP and rule behavior

The generic installers should require no production changes once platform metadata is correct:

- `mcp-installer.js` should write CLI MCP servers to its JSON file because the new platform declares `mcpConfigPath` and defaults to JSON.
- `rules-installer.js` should merge rules into `~/.gemini/GEMINI.md` because the new platform declares file-based rules.

Only change these modules if the tests expose a real incompatibility. Do not add undocumented Antigravity CLI MCP fields.

### 5. Update user and maintainer documentation

- `README.md`: add Antigravity CLI to the platform summary, exact Unix/macOS paths, Windows equivalents, workflow behavior, MCP support, and current release note.
- `package/README.md`: update features, supported platform matrix, install flow, file-based rules description, and Windows path note.
- `docs/index.html`: add a distinct Antigravity CLI compatibility card rather than relabeling the IDE.
- `AGENTS.md`: update the version, platform count, supported platform table, and installation wording.
- `package/CHANGELOG.md`: add a `2.11.0` entry describing the new platform, cross-platform detection, workflow conversion, and IDE false-positive fix.

### 6. Bump the package version

This is a backward-compatible new platform capability, so use a minor version bump from published `2.10.4` to `2.11.0`:

- Update `package/package.json`.
- Update both version fields in `package/package-lock.json`, retaining the user's existing uncommitted lockfile correction as part of the final consistent version change.

### 7. Verification and review

Run in this order:

1. Focused platform/installer/MCP/rules/E2E tests.
2. Full `npm test` from `package/`.
3. `npm run test:coverage` and enforce the repository's 90% line/function and 80% branch thresholds.
4. `npm pack --dry-run` to verify publish contents and package metadata.
5. `npm audit --omit=dev` and targeted secret/unsafe-pattern scans on the changed files.
6. `agentools platforms` against isolated macOS/Linux-style and Windows-style home fixtures through tests.
7. Review every changed file, file size, function size, and final `git diff`; remove generated artifacts and unrelated changes.

### 8. Publish workflow

After local verification passes:

1. Commit all intended changes without bypassing hooks.
2. Push `main` to `origin`.
3. Locate and watch the resulting GitHub Actions run with `gh`; if it fails, read the complete failed logs, fix the root cause, bump again only if npm already consumed the version, and repeat.
4. Confirm npm reports `agentools@2.11.0` as `latest`.
5. Install `agentools@latest` globally and verify `agentools --version`.
6. Run the documented self-tests in an isolated temporary home so user configuration is not overwritten.
7. Create GitHub release `v2.11.0` with affected commands and a no-migration-needed note.

## Regression Risks and Controls

- **IDE false positives:** tightening IDE detection can stop installs for users who only have a generic `.gemini` directory. This is intentional because that directory may belong to Gemini CLI or Antigravity CLI; the IDE-specific directory/app remains detected.
- **Shared global rules file:** IDE and CLI intentionally point to the same `GEMINI.md`. Repeated writes are content-identical and the rules installer already skips unnecessary I/O.
- **Workflow collisions:** existing force/skip semantics are preserved. A workflow with the same name as a skill follows the current Claude behavior; this change does not introduce a new precedence model.
- **Windows detection:** tests validate path construction and the official default install layout. Runtime `PATH` probing covers custom install directories without executing the binary.
- **Existing user config:** skill and MCP copies preserve the current `--force` behavior, and MCP writes preserve unrelated top-level keys and existing server entries.
- **Dirty worktree:** only the pre-existing `package/package-lock.json` version correction is present. It will be advanced consistently to the release version; no unrelated user change will be discarded.

## Completion Criteria

- Antigravity CLI appears as a separate detected platform.
- Skills and converted workflows land in `~/.gemini/antigravity-cli/skills/`.
- MCP servers land in `~/.gemini/antigravity-cli/mcp_config.json`.
- Global rules land in `~/.gemini/GEMINI.md`.
- macOS/Linux and Windows default installs are detectable without launching `agy`.
- Antigravity IDE is not inferred from a generic `.gemini` directory.
- Focused tests, full tests, coverage gates, packaging, audit, CI publish, installed-version check, isolated self-test, and GitHub release all pass.
