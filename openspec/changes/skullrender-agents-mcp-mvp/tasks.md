# Tasks — skullrender-agents-mcp-mvp

## Phase A — scaffolding

1. ✅ Create repo folder `SkullRender-Agents` with package metadata (`@skullrender/mcp-agents`).
2. ✅ Author OpenSpec artefacts (`proposal/design/spec/tasks`).
3. ✅ Add deterministic brief JSON Schema mirror + validator tests (`bun test`).

## Phase B — MCP surface

4. ✅ Implement `AgentsManager` loading YAML manifests tolerant of authoring mistakes (skip malformed with stderr log).

5. ✅ Implement MCP stdio bootstrap (`runMcpServer`) + esbuild bundled CLI shim.

## Phase C — ergonomics / docs

6. ✅ README quickstart linking dual MCP registration beside `skullrender-mcp-skills`.

7. ✅ Optional Claude Code setup merge (`bundle/cli.js setup claude-code`).

8. ⏳ Operational hardening backlog (post-MVP if OneDrive regressions recur): scripted integrity check verifying `@modelcontextprotocol/sdk/dist` completeness before MCP start.

9. ✅ Initialize git repo + first commit-ready tree (agents commit themselves).
