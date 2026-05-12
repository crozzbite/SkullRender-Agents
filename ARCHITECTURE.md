# ARCHITECTURE — SkullRender-Agents MCP

## Positioning

- **In scope MVP:** MCP host discovery + deterministic brief validation + versioned manifests.
- **Out of MVP:** Telegram bridge, Telegram bot orchestrator runtime, speculative LLM “auditor de flujo”.

## Layers

```
Cursor / Claude MCP host
       │ stdio
       ▼
bundle/cli.js  → runMcpServer(SKFLOW_ROOT)
       │ reads manifests/*.yaml , schemas/brief.schema.json
       └── skflow_* tools
```

Brief validation duplicates `schemas/brief.schema.json` in TypeScript (**single doc source** is the schema file); implementation must evolve in lock-step with schema edits.

## Cross-repo relations

| Repo | Responsibility |
|------|----------------|
| [`skullrender-mcp-skills`](../skullrender-mcp-skills) | SKILL.md discovery (`skills_*`) |
| SkullRender-Agents (`@skullrender/mcp-agents`) | Agent manifest + Presentador⇄Orquestador contract (`skflow_*`) |

## Operational notes

- OneDrive-heavy paths historically caused phantom `node_modules` entries — after clone prefer `bun install` locally; if modules look empty, reinstall or copy MCP SDK subtree from sibling as stopgap documented in backlog tasks if recurring.
