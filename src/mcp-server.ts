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
import { handleCallTool } from './handle-call-tool.js';

export { handleCallTool } from './handle-call-tool.js';
export type { CallToolResult } from './handle-call-tool.js';

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
    return handleCallTool(name, rawArgs, { agents, packs, briefValidator, repoRoot });
  });

  console.error('Starting @skullrender/mcp-agents …');
  console.error(`Repo root: ${repoRoot}`);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
