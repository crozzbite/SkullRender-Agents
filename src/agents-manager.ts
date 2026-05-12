import * as fs from 'fs';
import * as path from 'path';
import YAML from 'yaml';
import type { AgentManifest } from './types.js';

export class AgentsManager {
  private repoRoot: string;

  constructor(repoRoot: string) {
    this.repoRoot = repoRoot;
  }

  get manifestsDir(): string {
    return path.join(this.repoRoot, 'manifests');
  }

  listIds(): string[] {
    const dir = this.manifestsDir;
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'))
      .map((f) => path.join(dir, f));
  }

  /** Load all manifests; malformed files are skipped with console error. */
  loadAll(): Map<string, AgentManifest> {
    const map = new Map<string, AgentManifest>();
    for (const filePath of this.listIds()) {
      try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const data = YAML.parse(raw) as AgentManifest;
        if (!data?.id || typeof data.id !== 'string') {
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

  getAgent(id: string): AgentManifest | undefined {
    return this.loadAll().get(id);
  }

  formatList(): string {
    const all = this.loadAll();
    if (all.size === 0) return 'No manifests found.';
    const ids = [...all.keys()].sort((a, b) => a.localeCompare(b));
    const lines = ids.map((id) => {
      const m = all.get(id)!;
      const dn = m.display_name ?? m.id;
      const sm = typeof m.summary === 'string' ? m.summary.trim().split('\n')[0] ?? '' : '';
      return `- **${m.id}** — ${dn}\n  ${sm}`;
    });
    return [`# Agents (${all.size})\n`, ...lines].join('\n');
  }

  yamlText(id: string): string | null {
    const files = this.listIds();
    for (const fp of files) {
      try {
        const raw = fs.readFileSync(fp, 'utf8');
        const data = YAML.parse(raw) as AgentManifest;
        if (data?.id === id) return raw;
      } catch {
        /* skip */
      }
    }
    return null;
  }
}
