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
import { PacksManager } from './packs-manager.js';
import { listMcpTools } from './mcp-tools.js';
import { resolveIdentityPrompt } from './resolve-identity.js';
import type { AgentManifest } from './types.js';

/** MCP tools use skflow_ prefix vs skullrender-skills server's skills_* prefix. */

export async function runMcpServer(repoRoot: string): Promise<void> {
  const agents = new AgentsManager(repoRoot);
  const packs = new PacksManager(repoRoot);
  const briefValidator = new BriefValidator(repoRoot);

  const server = new Server(
    { name: '@skullrender/mcp-agents', version: '0.2.0' },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: listMcpTools(packs),
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

      case 'skflow_packs_list':
        return { content: [{ type: 'text', text: packs.formatList() }] };

      case 'skflow_pack_get': {
        const id = String((rawArgs as { id?: string }).id ?? '');
        const text = packs.yamlText(id);
        if (!text) {
          return {
            content: [{ type: 'text', text: `Pack id="${id}" not found.` }],
            isError: true,
          };
        }
        return { content: [{ type: 'text', text }] };
      }

      case 'skflow_identity_resolve': {
        const args = rawArgs as { id?: string; inject_pack?: boolean | string };
        const id = String(args.id ?? '');
        const office = agents.getAgent(id) as AgentManifest | undefined;
        if (!office) {
          return {
            content: [{ type: 'text', text: `Manifest id="${id}" not found.` }],
            isError: true,
          };
        }

        let packId: string | undefined;
        const inj = args.inject_pack;
        if (inj === false) {
          packId = undefined;
        } else if (typeof inj === 'string' && inj.trim()) {
          packId = inj.trim();
        } else if (inj === true || inj === undefined) {
          packId =
            typeof office.personality_pack === 'string'
              ? office.personality_pack
              : undefined;
          if (!packId) {
            for (const p of packs.loadAll().values()) {
              if (p.inject_default_into?.includes(id)) {
                packId = p.id;
                break;
              }
            }
          }
          // Default: inject only if personality_pack_default or explicit pack field
          if (
            inj === undefined &&
            office.personality_pack_default === false &&
            !office.personality_pack
          ) {
            packId = undefined;
          }
        }

        const pack = packId ? packs.getPack(packId) : undefined;
        if (packId && !pack) {
          return {
            content: [
              {
                type: 'text',
                text: `Pack id="${packId}" not found for office "${id}".`,
              },
            ],
            isError: true,
          };
        }

        const prompt = resolveIdentityPrompt(office, pack ?? null);
        return { content: [{ type: 'text', text: prompt }] };
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
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  });

  console.error('Starting @skullrender/mcp-agents …');
  console.error(`Repo root: ${repoRoot}`);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
