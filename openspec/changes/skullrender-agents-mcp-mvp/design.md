# Design — skullrender-agents-mcp-mvp

## Container view

```
MCP-capable IDE  ←stdio JSON-RPC→  @skullrender/mcp-agents  →  manifests/ + schemas/
```

## Tool matrix

| Name | Responsibility | Stateful? |
|------|----------------|-----------|
| `skflow_agents_list` | Render markdown-ish manifest index | Stateless |
| `skflow_agent_get` | Serve raw YAML textual contract | Stateless |
| `skflow_brief_validate` | Run deterministic structural validation | Stateless |
| `skflow_brief_schema` | Expose authoring schema literal | Stateless |

Validation intentionally **avoided external AJV** for Bun/OneDrive brittle installs — logic must stay aligned manually with schema until CI stabilizes.

## Configuration contract

Environment variable **`SKFLOW_ROOT`** (CLI positional fallback) resolves:

- `<root>/manifests/*.yaml`
- `<root>/schemas/brief.schema.json`

## Operational deployment

Bundler emits `bundle/cli.js`; consumer references absolute Windows path arguments (README template).

Future extension hooks (non-MVP placeholders kept out of codebase until spec'd):

1. MCP resource streams for manifests (optional MCP resources layer).
2. Optional JSON Schema codegen task reintroducing AJV once deterministic CI path proven.
