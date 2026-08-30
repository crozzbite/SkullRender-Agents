import type { PacksManager } from './packs-manager.js';

export type McpToolDef = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

const AGENT_TOOLS: McpToolDef[] = [
  {
    name: 'skflow_agents_list',
    description:
      'List declarative agent manifests (spine / Saep / Sae / Office* / legacy expertos).',
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
];

const PACK_TOOLS: McpToolDef[] = [
  {
    name: 'skflow_packs_list',
    description:
      'List personality packs in this SKFLOW_ROOT (Legion only: PackLich, PackGentleman, PackCerbero). Absent when the root has no packs/ folder (Scope B).',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'skflow_pack_get',
    description:
      'Get full YAML of one personality pack by id (e.g. PackLich). Legion SKFLOW_ROOT only.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
];

function identityTool(includePackTools: boolean): McpToolDef {
  return {
    name: 'skflow_identity_resolve',
    description: includePackTools
      ? 'Resolve office identity (+ optional personality pack) into a prompt block. Pack defaults from manifest.personality_pack or pack.inject_default_into. For Scope B use inject_pack: false.'
      : 'Resolve office identity into a prompt block. This SKFLOW_ROOT has no packs/; inject_pack is a no-op.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Office / agent manifest id',
        },
        inject_pack: {
          description:
            'true = inject default pack; false = office only; string = pack id to force. Ignored when this root has no packs/.',
          oneOf: [{ type: 'boolean' }, { type: 'string' }],
        },
      },
      required: ['id'],
    },
  };
}

const BRIEF_TOOLS: McpToolDef[] = [
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
    description:
      'Return the JSON Schema used to validate Presentador⇄Orquestador briefs (for prompting engineers).',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
];

/** Pack tools stay in code; they are advertised only when packs/ has YAML. */
export function hasPackFiles(packs: PacksManager): boolean {
  return packs.listFiles().length > 0;
}

export function listMcpTools(packs: PacksManager): McpToolDef[] {
  const includePackTools = hasPackFiles(packs);
  return [
    ...AGENT_TOOLS,
    ...(includePackTools ? PACK_TOOLS : []),
    identityTool(includePackTools),
    ...BRIEF_TOOLS,
  ];
}
