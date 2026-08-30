import { describe, expect, test } from 'bun:test';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PacksManager } from './packs-manager.ts';
import { listMcpTools } from './mcp-tools.ts';

describe('listMcpTools', () => {
  test('omits skflow_packs_* when SKFLOW_ROOT has no packs/ folder', () => {
    const root = mkdtempSync(join(tmpdir(), 'skflow-nopacks-'));
    const names = listMcpTools(new PacksManager(root)).map((t) => t.name);
    expect(names).not.toContain('skflow_packs_list');
    expect(names).not.toContain('skflow_pack_get');
    expect(names).toContain('skflow_agents_list');
    expect(names).toContain('skflow_identity_resolve');
    const identity = listMcpTools(new PacksManager(root)).find(
      (t) => t.name === 'skflow_identity_resolve',
    );
    expect(identity?.description).toMatch(/no packs/);
  });

  test('advertises skflow_packs_* when packs/ has YAML', () => {
    const root = mkdtempSync(join(tmpdir(), 'skflow-packs-'));
    mkdirSync(join(root, 'packs'));
    writeFileSync(
      join(root, 'packs', 'lich.yaml'),
      'id: PackLich\nkind: personality_pack\n',
      'utf8',
    );
    const names = listMcpTools(new PacksManager(root)).map((t) => t.name);
    expect(names).toContain('skflow_packs_list');
    expect(names).toContain('skflow_pack_get');
  });
});
