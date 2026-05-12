import { describe, expect, test } from 'bun:test';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { AgentsManager } from './agents-manager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

describe('AgentsManager', () => {
  test('loads four manifests', () => {
    const mgr = new AgentsManager(ROOT);
    const ids = [...mgr.loadAll().keys()].sort();
    expect(ids.sort()).toEqual(['experto_gentleman', 'experto_lich', 'orquestador', 'presentador']);
  });

  test('yamlText presentador', () => {
    const mgr = new AgentsManager(ROOT);
    expect(mgr.yamlText('presentador')).not.toBeNull();
  });
});
