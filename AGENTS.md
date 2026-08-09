# SkullRender-Agents — review rules (gga)

Sibling MCP of `skullrender-mcp-skills`. This repo ships **declarative** agent manifests + deterministic brief/identity tooling (`skflow_*`).

## Must

- Keep `schemas/*.json` as the contract SoT; TypeScript validators stay in lock-step.
- Prefer Bun tests for resolver/validator changes (`bun test src/`).
- Rebuild bundle after CLI/MCP changes: `bun run bundle`.
- Packs are personality-only; offices (Saep*) own SDLC handoffs.
- Never bind PackGentleman to SaepExperiencia (UX).
- Centinela/PackCerbero is veto-only — not a second Orquestador.

## Never

- Commit secrets or live MCP tokens.
- Invent LangGraph/Python agent runtimes in this repo (YAML + TS MCP + Cursor subagents).
- Skip Human Go for commit/PR/merge/deploy in consuming workspaces.

## Style

- TypeScript: no `any` without justification; prefer explicit types on public MCP tool I/O.
- Manifests: YAML with stable `id` fields; legacy wrappers stay thin and point to packs.
