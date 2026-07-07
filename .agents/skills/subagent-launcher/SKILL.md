---
name: subagent-launcher
description: Start or delegate work to a configured project subagent and ensure its configured skills are loaded. Use when current instructions or the user says to call, launch, spawn, invoke, delegate to, or use a specialized subagent; when a task matches an available subagent in the current instruction context; or when a platform-specific subagent command is needed for Antigravity or Codex.
---

# Subagent Launcher

## Purpose

1. You MUST check whether a suitable global agent config already exists.
2. If it does not exist, rely on the current context to create appropriate instructions for the agent before launching.

## Selection Workflow

1. Check what global agents are currently available. If none are suitable, use the current instruction context to identify other available subagents.
2. Select the subagent whose description and usage best match the requirements of the current task (even if the user did not explicitly request a subagent).
3. Resolve the selected subagent's config using the standard resolution priority (check workspace, then global config, then fallback to platform-native roles).
4. Read or inspect the resolved config only when it is represented as a readable file or resource. If the platform exposes a named role directly, use that native role metadata instead of inventing a file path.
5. Resolve every skill listed in the resolved config's `skills` field or equivalent platform metadata.
6. Pass the user's exact task plus any explicitly provided URLs, credentials, files, or constraints.
7. Do not use tools directly when current instructions say the subagent owns that workflow.

## Required Skill Loading

Treat the resolved config's `skills` field, or equivalent platform metadata, as required runtime dependencies, not as proof that the platform has auto-loaded those skills.

For every required skill listed by the resolved subagent config:

1. Resolve the skill by name through the current platform or session skill registry.
2. If the platform requires an explicit skill path, use the platform-resolved path or an explicit path provided by the user.
3. If the skill cannot be resolved by name or by an explicit path, report the missing skill instead of inventing instructions.
4. Attach the resolved skill to the subagent as a platform-native skill item when supported.
5. If native skill attachment is unavailable, explicitly instruct the subagent to read and follow the resolved skill before acting.
6. Do not make the main agent read full skill bodies unless the platform requires the content to be embedded in the subagent prompt.

## Model Selection

If the resolved config includes `codexModel`, pass it only when creating a Codex subagent and the current Codex runtime supports model overrides. Do not apply `codexModel` to Antigravity.

If the resolved config includes `codexReasoningEffort`, pass it only when creating a Codex subagent and the current Codex runtime supports reasoning-effort overrides.

If the selected platform does not support the requested override, or if no override is configured, let the subagent inherit the parent/session defaults.

## Antigravity

When `define_subagent` and `invoke_subagent` are available:

1. Define a subagent using the resolved subagent config. If the platform already exposes the subagent as a native role, use the native role instead of reconstructing it.
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

1. Prefer spawning the configured subagent by its platform-native role name when that role is available.
2. Spawn a generic `worker` agent for execution tasks, or an `explorer` agent for bounded codebase questions, only when no configured subagent role is available.
3. Prefer `fork_context: false` unless the subagent needs the current conversation history.
4. If the resolved config includes `codexModel`, pass it as `model` when the current Codex runtime supports model overrides.
5. If the resolved config includes `codexReasoningEffort`, pass it as `reasoning_effort` when the current Codex runtime supports reasoning-effort overrides.
6. Pass the selected agent config identifier and required skills as structured items when supported. Include a config path only when the platform or user provided an explicit resolved path:

```json
{
  "agent_type": "<subagent-name-or-worker>",
  "fork_context": false,
  "model": "<resolved codexModel when present and supported>",
  "reasoning_effort": "<resolved codexReasoningEffort when present and supported>",
  "items": [
    {
      "type": "text",
      "text": "Use the resolved config for subagent <subagent-name>."
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

7. Repeat the skill item for every required skill listed by the resolved config.
8. If skill items are unavailable, write a concise prompt that lists every required skill by name, plus any resolved paths only when the platform requires paths, and tells the worker to follow them before acting.
9. Wait for the subagent only when its result is needed for the next response or next action.
10. Close completed agents when they are no longer needed.

## Reporting

Report which subagent was used, whether it completed or was blocked, and the result needed by the user. Do not claim success until the subagent reports completion.
