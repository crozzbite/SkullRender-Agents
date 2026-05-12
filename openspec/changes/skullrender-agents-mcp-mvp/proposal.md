# Proposal: skullrender-agents-mcp-mvp

## Objective

Ship **`@skullrender/mcp-agents`** under `WorkDesktop/SkullRender-Agents`: an MCP sibling to `skullrender-mcp-skills` exposing declarative persona manifests (`Presentador`, `Orquestador`, expert placeholders) plus deterministic Presentador⇄Orquestador **brief** validation.

## Background

Multi-agent UX needs a predictable host surface (Option **C**) without coupling to `gentle-ai` IDE adapters. Anthropic MCP pattern already proven in-repo via skills server — we mirror transport with differentiated `skflow_*` capability namespace.

## Scope

- MCP stdio process + four tools ceiling (`skflow_agents_list`, `skflow_agent_get`, `skflow_brief_validate`, `skflow_brief_schema`).
- Four YAML manifests illustrating topology from architecture discussions.
- JSON Schema **`schemas/brief.schema.json`** mirrored by deterministic TS validator (+ tests).

## Out of Scope

See delta spec negatives — highlights: realtime LLM auditors, Telegram bridge, fused monorepo with skills server **this iteration**, Gentleman guardian LLM augmentation for conversational traces.

## Affected Artefacts

- New git repository `SkullRender-Agents/` (init post-docs).
- No modifications to GentlemanProgramming `gentle-ai`.
- Consumers update Cursor MCP JSON manually (README documents merge pattern).

## Approach

Reuse proven esbuild-bundle + stdio server shape from sibling; keep strict separation of MCP responsibilities (skills versus flow/manifest/registry).

## Risks

Windows + OneDrive can yield truncated `node_modules` — reinstall or vendor SDK subtree from sibling (ARCHITECTURE.md operational note).

## Success Criteria

- `bun test src/` GREEN.
- `node bundle/cli.js mcp` starts without throwing when manifests present.
- OpenSpec deltas approved before expanding tool surface beyond MVP cap.
