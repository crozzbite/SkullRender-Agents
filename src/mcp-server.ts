#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  type CallToolRequest,
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { AgentsManager } from './agents-manager.js';
import { BriefValidator } from './brief-validator.js';

/** MCP tools use skflow_ prefix vs skullrender-skills server's skills_* prefix. */

export async function runMcpServer(repoRoot: string): Promise<void> {
  const agents = new AgentsManager(repoRoot);
  const briefValidator = new BriefValidator(repoRoot);

  const server = new Server(
    { name: '@skullrender/mcp-agents', version: '0.1.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'skflow_agents_list',
        description: 'List declarative agent manifests (Presentador / Orquestador / expertos pattern).',
        inputSchema: { type: 'object', properties: {}, required: [] },
      },
      {
        name: 'skflow_agent_get',
        description:
          'Get full YAML text of one agent manifest by id. Use skflow_agents_list for available ids.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Manifest id field' } },
          required: ['id'],
        },
      },
      {
        name: 'skflow_brief_validate',
        description:
          'Validate a Presentador→Orquestador brief (JSON object or YAML/JSON string). Deterministic check mirroring schemas/brief.schema.json (no LLM).',
        inputSchema: {
          type: 'object',
          properties: {
            brief: {
              description:
                'Either a JSON object with goal/constraints/forbidden_capabilities or stringified YAML/JSON',
              oneOf: [{ type: 'object' }, { type: 'string' }],
            },
          },
          required: ['brief'],
        },
      },
      {
        name: 'skflow_brief_schema',
        description: 'Return the JSON Schema used to validate Presentador⇄Orquestador briefs (for prompting engineers).',
        inputSchema: { type: 'object', properties: {}, required: [] },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
    const { name, arguments: rawArgs } = request.params;

    switch (name) {
      case 'skflow_agents_list':
        return { content: [{ type: 'text', text: agents.formatList() }] };

      case 'skflow_agent_get': {
        const id = String((rawArgs as { id?: string }).id ?? '');
        const text = agents.yamlText(id);
        if (!text) {
          return {
            content: [{ type: 'text', text: `Manifest id="${id}" not found.` }],
            isError: true,
          };
        }
        return { content: [{ type: 'text', text }] };
      }

      case 'skflow_brief_validate': {
        const brief = (rawArgs as { brief?: unknown }).brief;
        if (brief === undefined) {
          return {
            content: [{ type: 'text', text: 'Missing brief argument.' }],
            isError: true,
          };
        }
        const result = briefValidator.validatePayload(brief);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'skflow_brief_schema': {
        const fs = await import('fs/promises');
        const path = await import('path');
        const p = path.join(repoRoot, 'schemas', 'brief.schema.json');
        const sch = await fs.readFile(p, 'utf8');
        return { content: [{ type: 'text', text: sch }] };
      }

      default:
        return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
    }
  });

  console.error('Starting @skullrender/mcp-agents …');
  console.error(`Repo root: ${repoRoot}`);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
