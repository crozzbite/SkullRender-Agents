#!/usr/bin/env node

// src/cli.ts
import * as fs4 from "fs";
import * as os from "os";
import * as path4 from "path";
import { fileURLToPath } from "url";

// src/mcp-server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from "@modelcontextprotocol/sdk/types.js";

// src/agents-manager.ts
import * as fs from "fs";
import * as path from "path";
import YAML from "yaml";
var AgentsManager = class {
  repoRoot;
  constructor(repoRoot) {
    this.repoRoot = repoRoot;
  }
  get manifestsDir() {
    return path.join(this.repoRoot, "manifests");
  }
  listIds() {
    const dir = this.manifestsDir;
    if (!fs.existsSync(dir))
      return [];
    return fs.readdirSync(dir).filter((f) => f.endsWith(".yaml") || f.endsWith(".yml")).map((f) => path.join(dir, f));
  }
  /** Load all manifests; malformed files are skipped with console error. */
  loadAll() {
    const map = /* @__PURE__ */ new Map();
    for (const filePath of this.listIds()) {
      try {
        const raw = fs.readFileSync(filePath, "utf8");
        const data = YAML.parse(raw);
        if (!data?.id || typeof data.id !== "string") {
          console.error(`AgentsManager: missing id in ${filePath}`);
          continue;
        }
        map.set(data.id, data);
      } catch (e) {
        console.error(`AgentsManager: failed ${filePath}`, e);
      }
    }
    return map;
  }
  getAgent(id) {
    return this.loadAll().get(id);
  }
  formatList() {
    const all = this.loadAll();
    if (all.size === 0)
      return "No manifests found.";
    const ids = [...all.keys()].sort((a, b) => a.localeCompare(b));
    const lines = ids.map((id) => {
      const m = all.get(id);
      const dn = m.display_name ?? m.id;
      const sm = typeof m.summary === "string" ? m.summary.trim().split("\n")[0] ?? "" : "";
      return `- **${m.id}** \u2014 ${dn}
  ${sm}`;
    });
    return [`# Agents (${all.size})
`, ...lines].join("\n");
  }
  yamlText(id) {
    const files = this.listIds();
    for (const fp of files) {
      try {
        const raw = fs.readFileSync(fp, "utf8");
        const data = YAML.parse(raw);
        if (data?.id === id)
          return raw;
      } catch {
      }
    }
    return null;
  }
};

// src/brief-validator.ts
import * as fs2 from "fs";
import * as path2 from "path";
import YAML2 from "yaml";
var ALLOWED_KEYS = /* @__PURE__ */ new Set([
  "goal",
  "constraints",
  "forbidden_capabilities",
  "change_id",
  "handoff_notes"
]);
function isPlainObject(o) {
  return typeof o === "object" && o !== null && !Array.isArray(o);
}
function validateBriefObject(data) {
  const errors = [];
  if (!isPlainObject(data)) {
    errors.push({ keyword: "type", instancePath: "", message: "Brief must be a JSON/YAML object" });
    return { valid: false, errors };
  }
  for (const key of Object.keys(data)) {
    if (!ALLOWED_KEYS.has(key)) {
      errors.push({
        keyword: "additionalProperties",
        instancePath: `/${key}`,
        message: `Property "${key}" is not permitted`
      });
    }
  }
  const goal = data["goal"];
  if (goal === void 0 || goal === "") {
    errors.push({ keyword: "required", instancePath: "/goal", message: "Missing or empty goal" });
  } else if (typeof goal !== "string") {
    errors.push({ keyword: "type", instancePath: "/goal", message: "goal must be a string" });
  }
  const constr = data["constraints"];
  if (constr === void 0) {
    errors.push({
      keyword: "required",
      instancePath: "/constraints",
      message: "constraints is required"
    });
  } else if (!Array.isArray(constr)) {
    errors.push({
      keyword: "type",
      instancePath: "/constraints",
      message: "constraints must be an array of strings"
    });
  } else {
    constr.forEach((c, i) => {
      if (typeof c !== "string" || c.length === 0) {
        errors.push({
          keyword: "type",
          instancePath: `/constraints/${i}`,
          message: "Each constraint must be a non-empty string"
        });
      }
    });
  }
  const forbidden = data["forbidden_capabilities"];
  if (forbidden === void 0) {
    errors.push({
      keyword: "required",
      instancePath: "/forbidden_capabilities",
      message: "forbidden_capabilities is required"
    });
  } else if (!Array.isArray(forbidden)) {
    errors.push({
      keyword: "type",
      instancePath: "/forbidden_capabilities",
      message: "forbidden_capabilities must be an array of strings"
    });
  } else if (forbidden.length < 1) {
    errors.push({
      keyword: "minItems",
      instancePath: "/forbidden_capabilities",
      message: "forbidden_capabilities must list at least one capability"
    });
  } else {
    forbidden.forEach((f, i) => {
      if (typeof f !== "string" || f.length === 0) {
        errors.push({
          keyword: "type",
          instancePath: `/forbidden_capabilities/${i}`,
          message: "Each forbidden entry must be a non-empty string"
        });
      }
    });
  }
  if (data["change_id"] !== void 0) {
    if (typeof data["change_id"] !== "string" || data["change_id"].length === 0) {
      errors.push({
        keyword: "type",
        instancePath: "/change_id",
        message: "change_id must be a non-empty string when provided"
      });
    }
  }
  if (data["handoff_notes"] !== void 0 && typeof data["handoff_notes"] !== "string") {
    errors.push({
      keyword: "type",
      instancePath: "/handoff_notes",
      message: "handoff_notes must be a string when provided"
    });
  }
  return errors.length === 0 ? { valid: true } : { valid: false, errors };
}
var BriefValidator = class {
  schemaPath;
  constructor(repoRoot) {
    this.schemaPath = path2.join(repoRoot, "schemas", "brief.schema.json");
    if (!fs2.existsSync(this.schemaPath)) {
      throw new Error(`Missing brief schema file: ${this.schemaPath}`);
    }
  }
  /** Accept JSON object or parseable YAML/JSON string. */
  validatePayload(input) {
    let data = input;
    if (typeof input === "string") {
      const trimmed = input.trim();
      if (!trimmed) {
        return {
          valid: false,
          errors: [{ keyword: "parse", message: "Brief string is empty" }]
        };
      }
      try {
        if (trimmed.startsWith("{")) {
          data = JSON.parse(trimmed);
        } else {
          data = YAML2.parse(trimmed);
        }
      } catch (e) {
        return {
          valid: false,
          errors: [
            {
              keyword: "parse",
              message: e instanceof Error ? e.message : "Failed to parse brief"
            }
          ]
        };
      }
    }
    return validateBriefObject(data);
  }
};

// src/packs-manager.ts
import * as fs3 from "fs";
import * as path3 from "path";
import YAML3 from "yaml";
var PacksManager = class {
  repoRoot;
  constructor(repoRoot) {
    this.repoRoot = repoRoot;
  }
  get packsDir() {
    return path3.join(this.repoRoot, "packs");
  }
  listFiles() {
    const dir = this.packsDir;
    if (!fs3.existsSync(dir))
      return [];
    return fs3.readdirSync(dir).filter((f) => f.endsWith(".yaml") || f.endsWith(".yml")).map((f) => path3.join(dir, f));
  }
  loadAll() {
    const map = /* @__PURE__ */ new Map();
    for (const filePath of this.listFiles()) {
      try {
        const raw = fs3.readFileSync(filePath, "utf8");
        const data = YAML3.parse(raw);
        if (!data?.id || typeof data.id !== "string") {
          console.error(`PacksManager: missing id in ${filePath}`);
          continue;
        }
        if (data.kind !== "personality_pack") {
          console.error(`PacksManager: kind must be personality_pack in ${filePath}`);
          continue;
        }
        map.set(data.id, data);
      } catch (e) {
        console.error(`PacksManager: failed ${filePath}`, e);
      }
    }
    return map;
  }
  getPack(id) {
    return this.loadAll().get(id);
  }
  yamlText(id) {
    for (const fp of this.listFiles()) {
      try {
        const raw = fs3.readFileSync(fp, "utf8");
        const data = YAML3.parse(raw);
        if (data?.id === id)
          return raw;
      } catch {
      }
    }
    return null;
  }
  formatList() {
    const all = this.loadAll();
    if (all.size === 0)
      return "No personality packs found.";
    const ids = [...all.keys()].sort((a, b) => a.localeCompare(b));
    const lines = ids.map((id) => {
      const p = all.get(id);
      const dn = p.display_name ?? p.id;
      const targets = (p.inject_default_into ?? []).join(", ") || "(none)";
      return `- **${p.id}** \u2014 ${dn}
  default inject: ${targets}`;
    });
    return [`# Personality packs (${all.size})
`, ...lines].join("\n");
  }
};

// src/resolve-identity.ts
function resolveIdentityPrompt(office, pack) {
  const lines = [];
  lines.push(`# Identity: ${office.id}`);
  if (office.display_name)
    lines.push(`Display: ${office.display_name}`);
  if (office.office)
    lines.push(`Office kind: ${office.office}`);
  if (office.stage)
    lines.push(`SDLC stage: ${office.stage}`);
  if (office.reports_to)
    lines.push(`Reports to: ${office.reports_to}`);
  if (office.handoff_owner)
    lines.push(`Handoff owner: yes`);
  if (office.summary) {
    lines.push("", "## Office summary", String(office.summary).trim());
  }
  if (office.rasci_rows?.length) {
    lines.push("", "## RASCI rows", office.rasci_rows.map((r) => `- ${r}`).join("\n"));
  }
  if (office.permissions) {
    lines.push("", "## Permissions (office)");
    const p = office.permissions;
    if (p.tools?.length)
      lines.push(`tools: ${p.tools.join(", ")}`);
    if (p.mcp?.length)
      lines.push(`mcp: ${p.mcp.join(", ")}`);
    if (p.skills?.length)
      lines.push(`skills: ${p.skills.join(", ")}`);
    if (p.rules?.length)
      lines.push(`rules: ${p.rules.join(", ")}`);
  }
  const officeMust = office.must ?? [];
  const officeNever = office.never ?? [];
  if (officeMust.length || officeNever.length) {
    lines.push("", "## Office must / never");
    for (const m of officeMust)
      lines.push(`MUST: ${m}`);
    for (const n of officeNever)
      lines.push(`NEVER: ${n}`);
  }
  if (pack) {
    lines.push("", `# Personality pack injected: ${pack.id}`);
    if (pack.display_name)
      lines.push(`Pack display: ${pack.display_name}`);
    if (pack.voice)
      lines.push("", "## Voice", String(pack.voice).trim());
    lines.push("", "## Pack must / never");
    for (const m of pack.must ?? [])
      lines.push(`MUST: ${m}`);
    for (const n of pack.never ?? [])
      lines.push(`NEVER: ${n}`);
  } else {
    lines.push("", "## Personality", "No pack injected (office-only run).");
  }
  lines.push(
    "",
    "## Legion runtime rules",
    "- One SDLC stage active at a time.",
    "- Saes work in parallel under Saep; report to Saep; only Saep/spine emit stage handoff.",
    "- Do not act as a second Orquestador."
  );
  return lines.join("\n");
}

// src/mcp-server.ts
async function runMcpServer(repoRoot) {
  const agents = new AgentsManager(repoRoot);
  const packs = new PacksManager(repoRoot);
  const briefValidator = new BriefValidator(repoRoot);
  const server = new Server(
    { name: "@skullrender/mcp-agents", version: "0.2.0" },
    { capabilities: { tools: {} } }
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "skflow_agents_list",
        description: "List declarative agent manifests (spine / Saep / Sae / legacy expertos).",
        inputSchema: { type: "object", properties: {}, required: [] }
      },
      {
        name: "skflow_agent_get",
        description: "Get full YAML text of one agent manifest by id. Use skflow_agents_list for available ids.",
        inputSchema: {
          type: "object",
          properties: { id: { type: "string", description: "Manifest id field" } },
          required: ["id"]
        }
      },
      {
        name: "skflow_packs_list",
        description: "List Legion personality packs (PackLich, PackGentleman, PackCerbero). Injected on-demand into offices.",
        inputSchema: { type: "object", properties: {}, required: [] }
      },
      {
        name: "skflow_pack_get",
        description: "Get full YAML of one personality pack by id (e.g. PackLich).",
        inputSchema: {
          type: "object",
          properties: { id: { type: "string" } },
          required: ["id"]
        }
      },
      {
        name: "skflow_identity_resolve",
        description: "Resolve office identity (+ optional personality pack) into a prompt block for Cursor subagents. Pack defaults from manifest.personality_pack or pack.inject_default_into.",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Office / agent manifest id (e.g. SaepAlcance, SaepArquitectura)"
            },
            inject_pack: {
              description: "true = inject default pack; false = office only; string = pack id to force",
              oneOf: [{ type: "boolean" }, { type: "string" }]
            }
          },
          required: ["id"]
        }
      },
      {
        name: "skflow_brief_validate",
        description: "Validate a Presentador\u2192Orquestador brief (JSON object or YAML/JSON string). Deterministic check mirroring schemas/brief.schema.json (no LLM).",
        inputSchema: {
          type: "object",
          properties: {
            brief: {
              description: "Either a JSON object with goal/constraints/forbidden_capabilities or stringified YAML/JSON",
              oneOf: [{ type: "object" }, { type: "string" }]
            }
          },
          required: ["brief"]
        }
      },
      {
        name: "skflow_brief_schema",
        description: "Return the JSON Schema used to validate Presentador\u21C4Orquestador briefs (for prompting engineers).",
        inputSchema: { type: "object", properties: {}, required: [] }
      }
    ]
  }));
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: rawArgs } = request.params;
    switch (name) {
      case "skflow_agents_list":
        return { content: [{ type: "text", text: agents.formatList() }] };
      case "skflow_agent_get": {
        const id = String(rawArgs.id ?? "");
        const text = agents.yamlText(id);
        if (!text) {
          return {
            content: [{ type: "text", text: `Manifest id="${id}" not found.` }],
            isError: true
          };
        }
        return { content: [{ type: "text", text }] };
      }
      case "skflow_packs_list":
        return { content: [{ type: "text", text: packs.formatList() }] };
      case "skflow_pack_get": {
        const id = String(rawArgs.id ?? "");
        const text = packs.yamlText(id);
        if (!text) {
          return {
            content: [{ type: "text", text: `Pack id="${id}" not found.` }],
            isError: true
          };
        }
        return { content: [{ type: "text", text }] };
      }
      case "skflow_identity_resolve": {
        const args = rawArgs;
        const id = String(args.id ?? "");
        const office = agents.getAgent(id);
        if (!office) {
          return {
            content: [{ type: "text", text: `Manifest id="${id}" not found.` }],
            isError: true
          };
        }
        let packId;
        const inj = args.inject_pack;
        if (inj === false) {
          packId = void 0;
        } else if (typeof inj === "string" && inj.trim()) {
          packId = inj.trim();
        } else if (inj === true || inj === void 0) {
          packId = typeof office.personality_pack === "string" ? office.personality_pack : void 0;
          if (!packId) {
            for (const p of packs.loadAll().values()) {
              if (p.inject_default_into?.includes(id)) {
                packId = p.id;
                break;
              }
            }
          }
          if (inj === void 0 && office.personality_pack_default === false && !office.personality_pack) {
            packId = void 0;
          }
        }
        const pack = packId ? packs.getPack(packId) : void 0;
        if (packId && !pack) {
          return {
            content: [
              {
                type: "text",
                text: `Pack id="${packId}" not found for office "${id}".`
              }
            ],
            isError: true
          };
        }
        const prompt = resolveIdentityPrompt(office, pack ?? null);
        return { content: [{ type: "text", text: prompt }] };
      }
      case "skflow_brief_validate": {
        const brief = rawArgs.brief;
        if (brief === void 0) {
          return {
            content: [{ type: "text", text: "Missing brief argument." }],
            isError: true
          };
        }
        const result = briefValidator.validatePayload(brief);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };
      }
      case "skflow_brief_schema": {
        const fs5 = await import("fs/promises");
        const path5 = await import("path");
        const p = path5.join(repoRoot, "schemas", "brief.schema.json");
        const sch = await fs5.readFile(p, "utf8");
        return { content: [{ type: "text", text: sch }] };
      }
      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true
        };
    }
  });
  console.error("Starting @skullrender/mcp-agents \u2026");
  console.error(`Repo root: ${repoRoot}`);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// src/cli.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path4.dirname(__filename);
var [, , command, ...argv] = process.argv;
function resolveRepoRoot() {
  if (process.env.SKFLOW_ROOT?.trim())
    return path4.resolve(process.env.SKFLOW_ROOT.trim());
  if (argv[0] === "--root" && argv[1])
    return path4.resolve(argv[1]);
  if (argv[0]?.includes(path4.sep) || /^[a-zA-Z]:[\\/]/.test(argv[0] ?? ""))
    return path4.resolve(argv[0]);
  return path4.resolve(__dirname, "..");
}
async function injectClaudeCode(home = os.homedir()) {
  const configDir = path4.join(home, ".claude");
  await fs4.promises.mkdir(configDir, { recursive: true });
  const settingsPath = path4.join(configDir, "settings.json");
  let parsed = {};
  try {
    if (fs4.existsSync(settingsPath))
      parsed = JSON.parse(await fs4.promises.readFile(settingsPath, "utf8"));
  } catch {
    parsed = {};
  }
  const mcpServers = typeof parsed["mcpServers"] === "object" && parsed["mcpServers"] !== null ? parsed["mcpServers"] : {};
  parsed["mcpServers"] = mcpServers;
  const exe = path4.resolve(__dirname, "cli.js");
  const root = resolveRepoRoot();
  mcpServers["skullrender-agents"] = {
    command: "node",
    args: [exe, "mcp", root],
    env: { SKFLOW_ROOT: root }
  };
  await fs4.promises.writeFile(settingsPath, JSON.stringify(parsed, null, 2), "utf8");
  console.log(`Merged skullrender-agents MCP into ${settingsPath}`);
}
async function main() {
  const root = resolveRepoRoot();
  const printHelp = () => {
    console.log(`@skullrender/mcp-agents`);
    console.log(`  node bundle/cli.js mcp [<SKFLOW_ROOT> | --root <dir>]   stdio MCP`);
    console.log(`  env SKFLOW_ROOT overrides default root (manifests/schemas parent of bundle/cli.js)`);
    console.log(`  node bundle/cli.js setup claude-code                     merge Claude Code MCP block`);
    console.log(`  Cursor MCP: register manually alongside skullrender-skills (same pattern, different CLI path).`);
  };
  switch (command) {
    case "mcp":
      await runMcpServer(root);
      break;
    case "setup":
      switch (argv[0]) {
        case "claude-code":
          await injectClaudeCode();
          break;
        default:
          console.log(`setup targets: claude-code`);
          printHelp();
      }
      break;
    default:
      printHelp();
  }
}
main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
export {
  resolveRepoRoot
};
