---
name: subagent-launcher
description: Start or delegate work to a configured project subagent. Use when a task matches an available subagent, or when a platform-specific subagent command is needed.
---

# Subagent Launcher

## Workflow

1. **Select**: Identify the best subagent for the current task.
2. **Resolve Config**: Use standard resolution priority (check workspace `agents/`, then global config, then native roles). Use native role metadata if available rather than inventing a file path.
3. **Load Skills**: Resolve every skill in the config's `skills` field via the platform registry. If supported, attach them natively. Otherwise, instruct the subagent to read the resolved skill paths before acting. Report any missing skills.
4. **Delegate**: Pass the exact task, context, and explicitly provided constraints. Do not do the work yourself if the subagent owns it.

## Antigravity (`define_subagent` / `invoke_subagent`)

1. Define the subagent using the resolved config (or native role). Grant full permissions (`enable_write_tools`, `enable_mcp_tools`, `enable_subagent_tools`) unless restricted by config.
2. Build the system prompt from the config's `instructions` and attach the resolved skills by path.
3. Invoke with the user's task.

## Codex (`multi_agent_v1.spawn_agent`)

1. Prefer spawning by native role name. Use generic `worker`/`explorer` only if no custom role exists.
2. Set `fork_context: false` unless history is needed.
3. Pass the config identifier and skills as structured items:
```json
{
  "agent_type": "<role-or-worker>",
  "fork_context": false,
  "items": [
    { "type": "text", "text": "Use config for subagent <name>" },
    { "type": "skill", "name": "<skill-name>" },
    { "type": "text", "text": "Task: <USER_REQUEST>" }
  ]
}
```
4. If native items are unavailable, write a prompt listing required skills/paths for the worker to follow.
5. Close completed agents when no longer needed.

## Reporting

Report the selected subagent, execution status, and final result. Do not claim success until it finishes.
