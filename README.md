# SkullRender-Agents (`@skullrender/mcp-agents`)

**What this is (plain language):**  
An **MCP (Model Context Protocol)** server that loads office manifests from a folder (`SKFLOW_ROOT`) and exposes tools (`skflow_*`) so Copilot / Cursor can **list offices, resolve identity, and validate briefs**.

**Two modes:**

| Mode | `SKFLOW_ROOT` | What you get |
|------|---------------|--------------|
| **Scope B neutral (recommended for VS Code)** | Sibling [`office-accelerator`](https://github.com/crozzbite/office-accelerator) → `dist/legion-neutral` | `Office*` only, **no** personality packs as SoT (`inject_pack: false`) |
| **Legacy Legion (this repo default)** | This repo’s own `manifests/` + `packs/` | `Saep*` / Presentador / Orquestador + optional packs |

Governance rules (Architect / Implementer / Security Guardian) live in **Capa A**:  
https://github.com/crozzbite/WorkDesktop/tree/governance/vscode-copilot-ready  

---

## Install

### Prerequisites

- [Node.js 18+](https://nodejs.org) (run `bundle/cli.js`)
- [Bun](https://bun.sh) (install / test / bundle)
- For Scope B: clone **office-accelerator** as a **sibling** folder (same parent directory)

```powershell
cd $env:USERPROFILE\Documents   # any parent you choose — do not hardcode into git
git clone https://github.com/crozzbite/SkullRender-Agents.git
git clone https://github.com/crozzbite/office-accelerator.git

cd SkullRender-Agents
bun install
bun test src/
bun run bundle
```

Optional env (only if folders are not siblings):

```powershell
[Environment]::SetEnvironmentVariable("SKFLOW_AGENTS_CLI", "<parent>\SkullRender-Agents\bundle\cli.js", "User")
[Environment]::SetEnvironmentVariable("SKFLOW_ROOT", "<parent>\office-accelerator\dist\legion-neutral", "User")
```

**Never commit** `C:\Users\…` paths in MCP JSON.

---

## Use

### A) Scope B neutral (VS Code) — preferred portable path

Do **not** point MCP at this repo’s default manifests. Use the accelerator wrapper (resolves paths without hardcoding):

1. Follow [office-accelerator README](https://github.com/crozzbite/office-accelerator#readme) → copy `templates/mcp.vscode.json.example` → `.vscode/mcp.json`
2. That script sets `SKFLOW_ROOT` to `dist/legion-neutral` (or env override) and runs:

```text
node <sibling>/SkullRender-Agents/bundle/cli.js mcp --root <SKFLOW_ROOT>
```

3. Policy: **`inject_pack: false` always**. Ignore `skflow_packs_*` as source of truth.

### B) Legacy Legion (this repo as root)

```powershell
cd SkullRender-Agents
node bundle/cli.js mcp
# or: node bundle/cli.js mcp --root .
```

### Tools (`skflow_*`)

| Tool | Purpose |
|------|---------|
| `skflow_agents_list` | List office ids in current `SKFLOW_ROOT` |
| `skflow_agent_get` | Raw YAML by id |
| `skflow_identity_resolve` | Office (± pack) → prompt block |
| `skflow_brief_validate` | Deterministic brief check |
| `skflow_brief_schema` | Brief JSON Schema |
| `skflow_packs_list` / `skflow_pack_get` | Packs (legacy / optional — **not** Scope B SoT) |

---

## Verify

```powershell
bun test src/
bun run bundle
Test-Path .\bundle\cli.js
```

With Scope B sibling promoted:

```powershell
cd ..\office-accelerator
bun run smoke:neutral
```

Expect `PASS: AgentsManager loadAll=10` against `dist/legion-neutral`.

---

## Deploy / publish

Not a cloud service. Publish = push `master` with a working `bundle/` story (consumers run `bun run bundle` locally).

```powershell
bun test src/
bun run bundle
# Human gate: commit + push
```

Do **not** commit machine-specific MCP absolute paths. Prefer accelerator’s `${workspaceFolder}` wrapper.

Claude Code helper (writes local Claude MCP — review paths before sharing machines):

```powershell
node bundle/cli.js setup claude-code
```

---

## Troubleshooting (Windows / OneDrive)

If `@modelcontextprotocol/sdk` lands without `dist/`:

1. Delete `node_modules` and `bun install` again here.
2. Or copy the SDK subtree from `skullrender-mcp-skills/node_modules/@modelcontextprotocol/sdk`.

---

## Layout

| Path | Role |
|------|------|
| `manifests/` | Default/legacy Legion offices |
| `packs/` | Optional personality packs |
| `schemas/` | brief / identity / pack schemas |
| `bundle/cli.js` | MCP entry (after `bun run bundle`) |

---

## Prompt for Copilot / other LLMs (paste after clone)

```
--- BEGIN SETUP PROMPT (SkullRender-Agents runtime) ---
You are wiring the MCP runtime for Scope B neutral offices.

This repo: https://github.com/crozzbite/SkullRender-Agents
Sibling product: https://github.com/crozzbite/office-accelerator (dist/legion-neutral)
Optional governance: https://github.com/crozzbite/WorkDesktop/tree/governance/vscode-copilot-ready

Hard rules:
- No C:\Users\… paths committed to git.
- For VS Code portable use, SKFLOW_ROOT must be office-accelerator/dist/legion-neutral (or env), NOT this repo’s legacy manifests/packs as SoT.
- inject_pack = false always for Scope B. Packs are not the source of truth.
- Prefer office-accelerator/scripts/mcp-offices.ps1 + templates/mcp.vscode.json.example over hand-written absolute MCP JSON.

Steps:
1) bun install && bun test src/ && bun run bundle in this repo
2) Confirm sibling office-accelerator exists; if not, give clone URL and sibling layout
3) In office-accelerator: bun install && bun run promote:neutral && bun run smoke:neutral
4) Configure VS Code MCP via accelerator template (workspaceFolder script)
5) Smoke: skflow_agents_list → exactly 10 Office* ids; resolve OfficeArchitecture with inject_pack false; brief_validate a minimal brief
6) If list shows Saep*/experto_*, SKFLOW_ROOT is wrong (legacy root) — fix root, do not “neutralize” by renaming in chat

Report PASS/FAIL per step with evidence. No product code changes unless I ask.
--- END SETUP PROMPT ---
```

---

## Related

- Pack-free generator: https://github.com/crozzbite/office-accelerator  
- Skills MCP sibling: https://github.com/crozzbite/skullrender-mcp-skills (`skills_*`)  
- Portable Copilot governance: https://github.com/crozzbite/WorkDesktop/tree/governance/vscode-copilot-ready  
