---
description: Subagent resolution strategy
---
# Subagent Resolution

> [!IMPORTANT]
> Before defining or spawning a subagent, you MUST always check if a predefined agent configuration exists.

1. **Local check**: Look inside the current workspace at `./.agents/agents/`
2. **Global check**: Look inside `{agentPlatformConfigRoot}/agents/`, where `{agentPlatformConfigRoot}` is the current AI platform's config root (Codex: `~/.codex/`; Antigravity IDE: `~/.gemini/antigravity/`).

If a matching configuration is found, use it as the source of truth for the subagent's instructions and required skills.
