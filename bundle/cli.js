#!/usr/bin/env node

// src/cli.ts
import * as fs3 from "fs";
import * as os from "os";
import * as path3 from "path";
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
    const lines = [...all.entries()].map(([, m]) => {
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

// src/mcp-server.ts
async function runMcpServer(repoRoot) {
  const agents = new AgentsManager(repoRoot);
  const briefValidator = new BriefValidator(repoRoot);
  const server = new Server(
    { name: "@skullrender/mcp-agents", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "skflow_agents_list",
        description: "List declarative agent manifests (Presentador / Orquestador / expertos pattern).",
        inputSchema: { type: "object", properties: {}, required: [] }
      },
      {
        name: "skflow_agent_get",
        description: "Get full YAML text of one agent manifest by id (presentador | orquestador | experto_gentleman | experto_lich).",
        inputSchema: {
          type: "object",
          properties: { id: { type: "string", description: "Manifest id field" } },
          required: ["id"]
        }
      },
      {
        name: "skflow_brief_validate",
        description: "Validate a Presentador\u2192Orquestador brief (JSON object or YAML/JSON string) against schemas/brief.schema.json. Pure schema check, no LLM.",
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
      case "skflow_brief_validate": {
        const brief = rawArgs.brief;
        if (brief === void 0) {
          return {
            content: [{ type: "text", text: "Missing brief argument." }],
            isError: true
          };
        }
        const result = briefValidator.validatePayload(brief);
        const text = JSON.stringify(result, null, 2);
        return {
          content: [{ type: "text", text }],
          ...result.valid ? {} : { isError: true }
        };
      }
      case "skflow_brief_schema": {
        const fs4 = await import("fs/promises");
        const path4 = await import("path");
        const p = path4.join(repoRoot, "schemas", "brief.schema.json");
        const sch = await fs4.readFile(p, "utf8");
        return { content: [{ type: "text", text: sch }] };
      }
      default:
        return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
    }
  });
  console.error("Starting @skullrender/mcp-agents \u2026");
  console.error(`Repo root: ${repoRoot}`);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// src/cli.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path3.dirname(__filename);
var [, , command, ...argv] = process.argv;
function resolveRepoRoot() {
  if (process.env.SKFLOW_ROOT?.trim())
    return path3.resolve(process.env.SKFLOW_ROOT.trim());
  if (argv[0] === "--root" && argv[1])
    return path3.resolve(argv[1]);
  if (argv[0]?.includes(path3.sep) || /^[a-zA-Z]:[\\/]/.test(argv[0] ?? ""))
    return path3.resolve(argv[0]);
  return path3.resolve(__dirname, "..");
}
async function injectCursorPartial(home = os.homedir()) {
  const dir = path3.join(home, ".cursor");
  await fs3.promises.mkdir(dir, { recursive: true });
  const dest = path3.join(dir, "mcp.json");
  let raw = "";
  try {
    raw = await fs3.promises.readFile(dest, "utf8");
  } catch {
  }
  let parsed = {};
  try {
    if (raw.trim())
      parsed = JSON.parse(raw);
  } catch {
    console.error(`[warn] ${dest} is not valid JSON \u2014 manual merge recommended.`);
    return;
  }
  if (!parsed.mcpServers)
    parsed.mcpServers = {};
  const bundleDefault = path3.resolve(__dirname, "cli.js");
  const exe = fs3.existsSync(bundleDefault) ? bundleDefault : path3.resolve(process.cwd(), "bundle/cli.js");
  parsed.mcpServers["skullrender-agents"] = {
    command: "node",
    args: ["--experimental-vm-modules", exe, "mcp", resolveRepoRoot()],
    env: { SKFLOW_ROOT: resolveRepoRoot() }
  };
  await fs3.promises.writeFile(dest, JSON.stringify(parsed, null, 2), "utf8");
  console.log(`[+] Merged skullrender-agents into ${dest} (review before trusting).`);
}
async function injectClaudeCode(home = os.homedir()) {
  const configDir = path3.join(home, ".claude");
  await fs3.promises.mkdir(configDir, { recursive: true });
  const settingsPath = path3.join(configDir, "settings.json");
  let parsed = {};
  try {
    if (fs3.existsSync(settingsPath))
      parsed = JSON.parse(await fs3.promises.readFile(settingsPath, "utf8"));
  } catch {
    parsed = {};
  }
  const mcpServers = typeof parsed["mcpServers"] === "object" && parsed["mcpServers"] !== null ? parsed["mcpServers"] : {};
  parsed["mcpServers"] = mcpServers;
  const exe = path3.resolve(__dirname, "cli.js");
  const root = resolveRepoRoot();
  mcpServers["skullrender-agents"] = {
    command: "node",
    args: [exe, "mcp", root],
    env: { SKFLOW_ROOT: root }
  };
  await fs3.promises.writeFile(settingsPath, JSON.stringify(parsed, null, 2), "utf8");
  console.log(`[+] Merged skullrender-agents MCP into ${settingsPath}`);
}
async function main() {
  const root = resolveRepoRoot();
  const printHelp = () => {
    console.log(`@skullrender/mcp-agents`);
    console.log(`  node bundle/cli.js mcp [SKFLOW_ROOT]     stdio MCP (default root = repo parent of bundle)`);
    console.log(`  node bundle/cli.js mcp --root <dir>`);
    console.log(`  env SKFLOW_ROOT may override manifests/schemas location`);
    console.log(`  node bundle/cli.js setup cursor|claude-code  inject MCP snippet (merge JSON)`);
  };
  switch (command) {
    case "mcp":
      await runMcpServer(root);
      break;
    case "setup":
      switch (argv[0]) {
        case "cursor":
          await injectCursorPartial();
          break;
        case "claude-code":
          await injectClaudeCode();
          break;
        default:
          console.log(`setup targets: cursor, claude-code`);
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
