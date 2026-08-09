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

## Legion planning doc (canonical)

Planeación viva de la Legion (topología SDLC, RASCI, kickoff paralelo, permisos, packs):

- Cursor canvas: `~/.cursor/projects/c-Users-zzorc-OneDrive-Desktop-WorkDesktop-DnDApp/canvases/legion-rasci-sdlc.canvas.tsx`
- Status: **v2.3** — office Saep/Sae + personality packs inyectables
- 8 etapas: Scope → Arqui → UX → **Ingenieria** → QA → Deploy → Prod → Mejora
- Packs: [`packs/lich.yaml`](packs/lich.yaml), [`packs/gentleman.yaml`](packs/gentleman.yaml), [`packs/cerbero.yaml`](packs/cerbero.yaml)
- Identity contract: [`schemas/identity.schema.json`](schemas/identity.schema.json)
- Offices: `SaepAlcance` … `SaepMejora` + spine `presentador` / `orquestador`
- MCP tools: `skflow_agents_list`, `skflow_agent_get`, `skflow_packs_list`, `skflow_pack_get`, `skflow_identity_resolve`, brief_*
- DnDApp Cursor rule: `.cursor/rules/legion.mdc` (alwaysApply)
- PackLich → SaepArquitectura; PackGentleman → SaepIngenieria (not UX); PackCerbero → centinela_cerbero

## Boot after Cursor restart

MCP `skullrender-agents` already in `DnDApp/.mcp.json` and `~/.cursor/mcp.json`. Rebuild: `bun run bundle` in SkullRender-Agents. Then restart Cursor and call `skflow_agents_list` / `skflow_identity_resolve`.

## Cross-repo relations

| Repo | Responsibility |
|------|----------------|
| [`skullrender-mcp-skills`](../skullrender-mcp-skills) | SKILL.md discovery (`skills_*`) |
| SkullRender-Agents (`@skullrender/mcp-agents`) | Agent manifest + Presentador⇄Orquestador contract (`skflow_*`) |

## Operational notes

- OneDrive-heavy paths historically caused phantom `node_modules` entries — after clone prefer `bun install` locally; if modules look empty, reinstall or copy MCP SDK subtree from sibling as stopgap documented in backlog tasks if recurring.
