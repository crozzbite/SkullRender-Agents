import { describe, expect, test } from 'bun:test';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AgentsManager } from './agents-manager.ts';
import { BriefValidator } from './brief-validator.ts';
import { handleCallTool } from './handle-call-tool.ts';
import { PacksManager } from './packs-manager.ts';

function ctx(root: string) {
  mkdirSync(join(root, 'schemas'), { recursive: true });
  writeFileSync(join(root, 'schemas', 'brief.schema.json'), '{}\n', 'utf8');
  return {
    agents: new AgentsManager(root),
    packs: new PacksManager(root),
    briefValidator: new BriefValidator(root),
    repoRoot: root,
  };
}

describe('handleCallTool pack tools', () => {
  test('rejects skflow_packs_* as Unknown tool when the root has no packs/', async () => {
    const root = mkdtempSync(join(tmpdir(), 'skflow-call-nopacks-'));
    mkdirSync(join(root, 'manifests'));
    const deps = ctx(root);

    for (const name of ['skflow_packs_list', 'skflow_pack_get'] as const) {
      const result = await handleCallTool(name, { id: 'PackLich' }, deps);
      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toBe(`Unknown tool: ${name}`);
    }
  });

  test('serves skflow_packs_list when packs/ has YAML', async () => {
    const root = mkdtempSync(join(tmpdir(), 'skflow-call-packs-'));
    mkdirSync(join(root, 'packs'));
    writeFileSync(
      join(root, 'packs', 'lich.yaml'),
      'id: PackLich\nkind: personality_pack\n',
      'utf8',
    );
    const result = await handleCallTool('skflow_packs_list', {}, ctx(root));
    expect(result.isError).toBeUndefined();
    expect(result.content[0]?.text).toMatch(/PackLich/);
  });
});
