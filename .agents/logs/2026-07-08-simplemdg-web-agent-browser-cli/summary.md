# Task Summary

## Objective

Update the `simplemdg-web` agent configuration so its instructions explicitly require using the `agent-browser` CLI to open, navigate, and interact with the web application.

## Modified Files

- `.agents/agents/simplemdg-web/agent.json`
- `.agents/logs/2026-07-08-simplemdg-web-agent-browser-cli/summary.md`
- `.agents/logs/2026-07-08-simplemdg-web-agent-browser-cli/tool-trace.md`

## Lessons & Decisions

- The existing agent already required the `simplemdg-web` skill and referenced agent-browser generally.
- The instruction was tightened from skill-level wording to an explicit CLI requirement so future agents know browser actions must be performed through `agent-browser`.
- JSON validation was run after the edit to catch syntax regressions before commit.
