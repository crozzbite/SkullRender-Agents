## ADDED Capability @skullrender/mcp-agents

### Requirement: MCP server identity

#### Scenario: List metadata

GIVEN MCP host initializes server  
WHEN handshake completes  
THEN server name MUST identify as `@skullrender/mcp-agents` semver `0.1.0` (until bumped).

---

### Requirement: Agent discovery

#### Scenario: Enumerate manifests

GIVEN manifests directory contains valid YAML declaring `id`  
WHEN tool `skflow_agents_list` runs  
THEN response MUST summarise every loaded id ordered lexicographically by internal map iteration stability (deterministic alphabetical via presentation sort upstream).

_(Implementation sorts keys for tests guaranteeing stable output.)_

#### Scenario: Missing agent

WHEN tool `skflow_agent_get` called with unknown id  
THEN MCP returns `isError` true textual explanation.

---

### Requirement: Brief validation

#### Scenario: Valid structured brief

GIVEN JSON object complying with brief schema semantics  
WHEN `skflow_brief_validate` invoked  
THEN result JSON `{ "valid": true }`.

#### Scenario: Forbidden empty prohibitions array

GIVEN `forbidden_capabilities` empty  
WHEN validation runs  
THEN valid MUST be false enumerating structured error records.

---

### Requirement: Explicit negatives (out of MCP host)

The MVP server MUST NOT:

- Maintain Telegram transport,
- Persist chat transcripts,
- Auto-spawn Gentleman guardian LLM reviews,
- Replace `skullrender-mcp-skills` responsibilities (`skills_*` namespace remains exclusive sibling domain).
