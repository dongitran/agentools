---
name: subagent-launcher
description: Start or delegate work to a configured project subagent and ensure its configured skills are loaded. Use when AGENTS.md or the user says to call, launch, spawn, invoke, delegate to, or use a specialized subagent; when a task matches an available subagent listed in AGENTS.md; or when a platform-specific subagent command is needed for Antigravity or Codex.
---

# Subagent Launcher

## Purpose

Use this skill from the main agent to start the appropriate configured subagent without hard-coding agent-specific instructions in the launcher.

The source of truth for available subagents is `AGENTS.md`. Each subagent's concrete instructions, required skills, and role live in `.agents/agents/<name>/agent.json`.

## Selection Workflow

1. Read the nearest relevant `AGENTS.md`.
2. Select the subagent whose description and usage match the user's request.
3. Read that subagent's `.agents/agents/<name>/agent.json`.
4. Resolve every skill listed in `agent.json.skills`.
5. Pass the user's exact task plus any explicitly provided URLs, credentials, files, or constraints.
6. Do not use tools directly when `AGENTS.md` says the subagent owns that workflow.

## Required Skill Loading

Treat `agent.json.skills` as required runtime dependencies, not as proof that the platform has auto-loaded those skills.

For every skill listed in `.agents/agents/<name>/agent.json`:

1. Resolve the skill by name through the current platform or session skill registry.
2. If the platform requires an explicit skill path, use the platform-resolved path or an explicit path provided by the user.
3. If the skill cannot be resolved by name or by an explicit path, report the missing skill instead of inventing instructions.
4. Attach the resolved skill to the subagent as a platform-native skill item when supported.
5. If native skill attachment is unavailable, explicitly instruct the subagent to read and follow the resolved skill before acting.
6. Do not make the main agent read full skill bodies unless the platform requires the content to be embedded in the subagent prompt.

## Model Selection

If `.agents/agents/<name>/agent.json` includes `codexModel`, pass it only when creating a Codex subagent and the current Codex runtime supports model overrides. Do not apply `codexModel` to Antigravity.

If `.agents/agents/<name>/agent.json` includes `codexReasoningEffort`, pass it only when creating a Codex subagent and the current Codex runtime supports reasoning-effort overrides.

If the selected platform does not support the requested override, or if no override is configured, let the subagent inherit the parent/session defaults.

## Antigravity

When `define_subagent` and `invoke_subagent` are available:

1. Define a subagent using values from `.agents/agents/<name>/agent.json`.
2. Use full permissions unless the agent config says otherwise:
   - `enable_write_tools: true`
   - `enable_mcp_tools: true`
   - `enable_subagent_tools: true`
3. Build the system prompt from:
   - The agent config `instructions`.
   - The resolved skills listed in the agent config, attached by path when supported.
   - Any platform-required skill content only if Antigravity cannot attach skills by path.
4. Ignore `codexModel` and `codexReasoningEffort`; those fields are Codex-specific.
5. Invoke the subagent with the user's task.

## Codex

When `multi_agent_v1.spawn_agent` is available:

1. Spawn a `worker` agent for execution tasks, or an `explorer` agent for bounded codebase questions.
2. Prefer `fork_context: false` unless the subagent needs the current conversation history.
3. If `agent.json.codexModel` is present, pass it as `model` when the current Codex runtime supports model overrides.
4. If `agent.json.codexReasoningEffort` is present, pass it as `reasoning_effort` when the current Codex runtime supports reasoning-effort overrides.
5. Pass the selected agent config and required skills as structured items when supported:

```json
{
  "agent_type": "worker",
  "fork_context": false,
  "model": "<agent.json.codexModel when present and supported>",
  "reasoning_effort": "<agent.json.codexReasoningEffort when present and supported>",
  "items": [
    {
      "type": "text",
      "text": "Use this agent config: .agents/agents/<name>/agent.json"
    },
    {
      "type": "skill",
      "name": "<skill-name>"
    },
    {
      "type": "text",
      "text": "Execute this delegated task: <USER_REQUEST>"
    }
  ]
}
```

6. Repeat the skill item for every skill listed in `agent.json.skills`.
7. If skill items are unavailable, write a concise prompt that lists every required skill by name, plus any resolved paths only when the platform requires paths, and tells the worker to follow them before acting.
8. Wait for the subagent only when its result is needed for the next response or next action.
9. Close completed agents when they are no longer needed.

## Reporting

Report which subagent was used, whether it completed or was blocked, and the result needed by the user. Do not claim success until the subagent reports completion.
