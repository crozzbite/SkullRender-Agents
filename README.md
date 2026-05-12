# SkullRender-Agents (@skullrender/mcp-agents)

MCP stdio server: **DECLARATIVE** agent manifests (Presentador / Orquestador / expertos) plus **deterministic validation** for the Presentador→Orquestador **brief**.

Sibling of [`skullrender-mcp-skills`](../skullrender-mcp-skills) (`skills_*` vs `skflow_*` tools).

## Prerequisites

- **Bun** (preferred) — `bun install`
- Node 18+ to run bundled CLI

## Scripts

```bash
bun install
bun test src/
node ./node_modules/esbuild/lib/main.js ./src/cli.ts --bundle --platform=node --format=esm --outfile=bundle/cli.js --packages=external
bun run typecheck   # tsc (--noEmit, tests excluded from project)
```

## Run MCP locally

Default root is the repo directory (expects `manifests/` and `schemas/`).

```powershell
cd C:\...\SkullRender-Agents
node bundle/cli.js mcp
```

Optional:

```powershell
$env:SKFLOW_ROOT="C:\path\to\alternate\configs"
node bundle/cli.js mcp --root "C:\path\to\alternate\configs"
```

## Tools (prefijo `skflow_`)

| Tool | Purpose |
|------|---------|
| `skflow_agents_list` | Enumerate manifests |
| `skflow_agent_get` | Raw YAML manifest by id |
| `skflow_brief_validate` | Validate brief JSON/YAML (`valid` vs schema errors, no LLM) |
| `skflow_brief_schema` | Return `schemas/brief.schema.json` string |

## Cursor / Claude MCP registration

Install **both** MCP servers independently:

1. Existing **skills**: follow `skullrender-mcp-skills` README (`skullrender-skills`).
2. **Agents** (this repo): merge block:

```json
"skullrender-agents": {
  "command": "node",
  "args": ["C:/FULL/PATH/SkullRender-Agents/bundle/cli.js", "mcp"],
  "env": { "SKFLOW_ROOT": "C:/FULL/PATH/SkullRender-Agents" }
}
```

Claude Code helper (merges `.claude/settings.json`):

```powershell
cd SkullRender-Agents
node bundle/cli.js setup claude-code
```

## Troubleshooting (Windows / OneDrive)

Sometimes `@modelcontextprotocol/sdk` lands without a `dist/` tree (imports fail referencing `server/index.js`).

1. Delete `node_modules` and run `bun install` again from this folder.
2. If it persists, copy `skullrender-mcp-skills/node_modules/@modelcontextprotocol/sdk` here and rerun the bundle command.

## OpenSpec

Change `openspec/changes/skullrender-agents-mcp-mvp/` holds proposal, delta spec, design, tasks.

Canon references: [WorkDesktop `docs/00-version-index.md`](../docs/00-version-index.md) (authoritative when marked current).
