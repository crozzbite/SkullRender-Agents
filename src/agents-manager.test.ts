import { describe, expect, test } from 'bun:test';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { AgentsManager } from './agents-manager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const EXPECTED_IDS = [
  'SaepAlcance',
  'SaepArquitectura',
  'SaepCalidad',
  'SaepDespliegue',
  'SaepExperiencia',
  'SaepIngenieria',
  'SaepMejora',
  'SaepProduccion',
  'centinela_cerbero',
  'experto_gentleman',
  'experto_lich',
  'orquestador',
  'presentador',
];

describe('AgentsManager', () => {
  test('loads spine, Saep offices, and legacy wrappers', () => {
    const mgr = new AgentsManager(ROOT);
    const ids = [...mgr.loadAll().keys()].sort();
    expect(ids).toEqual([...EXPECTED_IDS].sort());
  });

  test('yamlText presentador', () => {
    const mgr = new AgentsManager(ROOT);
    expect(mgr.yamlText('presentador')).not.toBeNull();
  });
});
