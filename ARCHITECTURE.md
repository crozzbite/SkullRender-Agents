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

- Status: **v2.3** — office Saep/Sae + personality packs inyectables
- Planning canvas lives in the **DnDApp** Cursor workspace (local-only; not shipped in this repo — do not clone a `~/.cursor/projects/…` path)
- 8 etapas: Scope → Arqui → UX → **Ingenieria** → QA → Deploy → Prod → Mejora
- Packs: [`packs/lich.yaml`](packs/lich.yaml), [`packs/gentleman.yaml`](packs/gentleman.yaml), [`packs/cerbero.yaml`](packs/cerbero.yaml)
- Identity contract: [`schemas/identity.schema.json`](schemas/identity.schema.json)
- Offices: `SaepAlcance` … `SaepMejora` + spine `presentador` / `orquestador`
- MCP tools: `skflow_agents_list`, `skflow_agent_get`, `skflow_packs_list`, `skflow_pack_get`, `skflow_identity_resolve`, brief_*
- DnDApp Cursor rule: `.cursor/rules/legion.mdc` (alwaysApply)
- PackLich → SaepArquitectura; PackGentleman → SaepIngenieria (not UX); PackCerbero → centinela_cerbero

## Sae delegation contract (enforced, not documented-only)

A `Sae` (Sub Agente Experto) is an expert subagent under exactly one `Saep` stage office.
`AgentsManager.loadAll()` **throws** when a file cannot be parsed, has no `id`, or a manifest with `office: sae`:

- has no `reports_to`;
- reports to an id that is not loaded;
- reports to something that is not `office: saep` (spine shortcut or Sae-to-Sae nesting);
- holds the Task tool or sets `handoff_owner: true`.

`yamlText` / `skflow_agent_get` resolve through `loadAll`, so a broken sibling is not skipped.
`skflow_packs_list` / `skflow_pack_get` are advertised only when `packs/` has YAML; CallTool of those names on a pack-free root returns `Unknown tool`.

`officeTree()` exposes the spine / Saep / Sae layering, and `formatList()` renders Saes indented
under their office so `skflow_agents_list` shows who reports to whom. This deliberately avoids a
new `skflow_office_tree` tool — the hierarchy rides the existing tool rather than adding a
cross-repo contract to keep in sync.

`skflow_identity_resolve` adds a **Sae boundary** block for `office: sae`, stating the parent
office, that the Sae does not emit the stage handoff, and that it does not delegate further.

Roster generation lives in [`office-accelerator`](../office-accelerator) (`saes:` in a cookbook).
This repo serves and validates; it does not author the catalog.

## Boot after Cursor restart

Register MCP `skullrender-agents` in the consuming workspace (e.g. DnDApp `.mcp.json` or Cursor user MCP). Rebuild: `bun run bundle` in SkullRender-Agents (if Bun fails, `npm install` then `npm run bundle`). Then restart the host and call `skflow_agents_list` / `skflow_identity_resolve`.

## Cross-repo relations

| Repo | Responsibility |
|------|----------------|
| [`skullrender-mcp-skills`](../skullrender-mcp-skills) | SKILL.md discovery (`skills_*`) |
| SkullRender-Agents (`@skullrender/mcp-agents`) | Agent manifest + Presentador⇄Orquestador contract (`skflow_*`) |

## Operational notes

- OneDrive-heavy paths historically caused phantom `node_modules` entries — after clone prefer `bun install` locally; if Bun fails, `npm install` (do not commit `package-lock.json` while `bun.lock` is the canonical lockfile). If modules look empty, reinstall.
