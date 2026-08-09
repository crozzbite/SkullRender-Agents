# SkullRender-Agents (@skullrender/mcp-agents)

MCP stdio server for **Legion** declarative offices (Presentador / Orquestador / Saep*) plus optional **personality packs**, identity resolve, and deterministic Presentador→Orquestador **brief** validation.

- Repo: https://github.com/crozzbite/SkullRender-Agents  
- Sibling skills MCP: [`skullrender-mcp-skills`](https://github.com/crozzbite/skullrender-mcp-skills) (`skills_*` vs `skflow_*`)  
- Pack-free formula (generic offices): [`office-accelerator`](https://github.com/crozzbite/office-accelerator)

## Prerequisites

- **Bun** (preferred) — `bun install`
- Node 18+ to run the bundled CLI

## Scripts

```bash
bun install
bun test src/
bun run bundle
bun run typecheck
```

## Run MCP locally

Default root is this repo (`manifests/`, `packs/`, `schemas/`).

```powershell
cd path/to/SkullRender-Agents
node bundle/cli.js mcp
```

Optional alternate config root (e.g. accelerator `out/`):

```powershell
$env:SKFLOW_ROOT="C:/path/to/out/demo"
node bundle/cli.js mcp --root $env:SKFLOW_ROOT
```

## Tools (`skflow_*`)

| Tool | Purpose |
|------|---------|
| `skflow_agents_list` | Enumerate office manifests |
| `skflow_agent_get` | Raw YAML by id |
| `skflow_packs_list` | Personality packs (Lich / Gentleman / Cerbero) |
| `skflow_pack_get` | Raw pack YAML by id |
| `skflow_identity_resolve` | Office ± pack → prompt block (`inject_pack`) |
| `skflow_brief_validate` | Validate brief JSON/YAML (no LLM) |
| `skflow_brief_schema` | Return `schemas/brief.schema.json` |

Legacy ids (`experto_*`, `centinela_cerbero`) remain for compatibility; prefer Saep* + packs.

## Cursor MCP registration

```json
"skullrender-agents": {
  "command": "node",
  "args": ["C:/FULL/PATH/SkullRender-Agents/bundle/cli.js", "mcp"],
  "env": { "SKFLOW_ROOT": "C:/FULL/PATH/SkullRender-Agents" }
}
```

Claude Code helper:

```powershell
node bundle/cli.js setup claude-code
```

## Troubleshooting (Windows / OneDrive)

If `@modelcontextprotocol/sdk` lands without `dist/`:

1. Delete `node_modules` and `bun install` again from this folder.
2. Or copy the SDK subtree from `skullrender-mcp-skills/node_modules/@modelcontextprotocol/sdk`.

## Layout

| Path | Role |
|------|------|
| `manifests/` | Spine + Saep offices (+ legacy wrappers) |
| `packs/` | Personality packs (optional inject) |
| `schemas/` | brief / identity / personality-pack |
| `handoffs/` | Session handoff notes |
| `openspec/` | Change artifacts |

## Hygiene

- Ignore local caches (`.atl/`, `.claude/`, most `.cursor/`).
- Do not commit secrets or machine-specific MCP absolute paths.
- `gga` project config: `.gga` (excludes `bundle/` from review payload).
