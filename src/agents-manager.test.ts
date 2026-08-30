import { describe, expect, test } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { AgentsManager } from './agents-manager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/** Build a throwaway SKFLOW root holding only the given manifests. */
function fixtureRoot(manifests: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skflow-tree-'));
  const dir = path.join(root, 'manifests');
  fs.mkdirSync(dir, { recursive: true });
  for (const [id, body] of Object.entries(manifests)) {
    fs.writeFileSync(path.join(dir, `${id}.yaml`), body, 'utf8');
  }
  return root;
}

const PMO = `id: OfficePmo\noffice: spine\nreports_to: OfficeFacade\npersonality_pack_default: false\n`;
const ARCH = `id: OfficeArchitecture\noffice: saep\nstage: architecture\nreports_to: OfficePmo\nhandoff_owner: true\npersonality_pack_default: false\n`;
const sae = (id: string, reportsTo: string) =>
  `id: ${id}\noffice: sae\nstage: architecture\nreports_to: ${reportsTo}\nhandoff_owner: false\npersonality_pack_default: false\n`;

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

describe('AgentsManager office tree', () => {
  test('groups Saes under the Saep they report to', () => {
    const mgr = new AgentsManager(
      fixtureRoot({
        OfficePmo: PMO,
        OfficeArchitecture: ARCH,
        OfficeSaeContracts: sae('OfficeSaeContracts', 'OfficeArchitecture'),
        OfficeSaeDataModel: sae('OfficeSaeDataModel', 'OfficeArchitecture'),
      }),
    );
    const tree = mgr.officeTree();
    expect(tree.spine).toEqual(['OfficePmo']);
    expect(tree.saeps).toEqual([
      {
        id: 'OfficeArchitecture',
        saes: ['OfficeSaeContracts', 'OfficeSaeDataModel'],
      },
    ]);
  });

  test('loadAll fails loud when a Sae reports to a missing parent', () => {
    const mgr = new AgentsManager(
      fixtureRoot({
        OfficePmo: PMO,
        OfficeSaeGhost: sae('OfficeSaeGhost', 'OfficeNotThere'),
      }),
    );
    expect(() => mgr.loadAll()).toThrow(/OfficeSaeGhost.*OfficeNotThere/);
  });

  test('loadAll fails loud when a Sae reports to another Sae', () => {
    const mgr = new AgentsManager(
      fixtureRoot({
        OfficePmo: PMO,
        OfficeArchitecture: ARCH,
        OfficeSaeContracts: sae('OfficeSaeContracts', 'OfficeArchitecture'),
        OfficeSaeNested: sae('OfficeSaeNested', 'OfficeSaeContracts'),
      }),
    );
    expect(() => mgr.loadAll()).toThrow(/OfficeSaeNested/);
  });

  test('loadAll fails loud when a Sae reports straight to spine', () => {
    const mgr = new AgentsManager(
      fixtureRoot({
        OfficePmo: PMO,
        OfficeSaeShortcut: sae('OfficeSaeShortcut', 'OfficePmo'),
      }),
    );
    expect(() => mgr.loadAll()).toThrow(/OfficeSaeShortcut/);
  });

  test('formatList nests Saes under their Saep', () => {
    const mgr = new AgentsManager(
      fixtureRoot({
        OfficePmo: PMO,
        OfficeArchitecture: ARCH,
        OfficeSaeContracts: sae('OfficeSaeContracts', 'OfficeArchitecture'),
      }),
    );
    const out = mgr.formatList();
    const archLine = out.indexOf('OfficeArchitecture');
    const saeLine = out.indexOf('OfficeSaeContracts');
    expect(archLine).toBeGreaterThan(-1);
    expect(saeLine).toBeGreaterThan(archLine);
    // Literal spaces, not \s: \s would span the newline and pass on a flat list.
    expect(out).toMatch(/^ {2,}- \*\*OfficeSaeContracts\*\*/m);
    expect(out).toMatch(/^- \*\*OfficeArchitecture\*\*/m);
  });
});
