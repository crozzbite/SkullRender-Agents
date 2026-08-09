import * as fs from 'fs';
import * as path from 'path';
import YAML from 'yaml';

export interface PersonalityPack {
  id: string;
  kind: 'personality_pack';
  display_name?: string;
  voice?: string;
  inject_default_into?: string[];
  inject_optional_into?: string[];
  must?: string[];
  never?: string[];
  source_legacy_manifest?: string;
  note?: string;
  [key: string]: unknown;
}

export class PacksManager {
  private repoRoot: string;

  constructor(repoRoot: string) {
    this.repoRoot = repoRoot;
  }

  get packsDir(): string {
    return path.join(this.repoRoot, 'packs');
  }

  listFiles(): string[] {
    const dir = this.packsDir;
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'))
      .map((f) => path.join(dir, f));
  }

  loadAll(): Map<string, PersonalityPack> {
    const map = new Map<string, PersonalityPack>();
    for (const filePath of this.listFiles()) {
      try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const data = YAML.parse(raw) as PersonalityPack;
        if (!data?.id || typeof data.id !== 'string') {
          console.error(`PacksManager: missing id in ${filePath}`);
          continue;
        }
        if (data.kind !== 'personality_pack') {
          console.error(`PacksManager: kind must be personality_pack in ${filePath}`);
          continue;
        }
        map.set(data.id, data);
      } catch (e) {
        console.error(`PacksManager: failed ${filePath}`, e);
      }
    }
    return map;
  }

  getPack(id: string): PersonalityPack | undefined {
    return this.loadAll().get(id);
  }

  yamlText(id: string): string | null {
    for (const fp of this.listFiles()) {
      try {
        const raw = fs.readFileSync(fp, 'utf8');
        const data = YAML.parse(raw) as PersonalityPack;
        if (data?.id === id) return raw;
      } catch {
        /* skip */
      }
    }
    return null;
  }

  formatList(): string {
    const all = this.loadAll();
    if (all.size === 0) return 'No personality packs found.';
    const ids = [...all.keys()].sort((a, b) => a.localeCompare(b));
    const lines = ids.map((id) => {
      const p = all.get(id)!;
      const dn = p.display_name ?? p.id;
      const targets = (p.inject_default_into ?? []).join(', ') || '(none)';
      return `- **${p.id}** — ${dn}\n  default inject: ${targets}`;
    });
    return [`# Personality packs (${all.size})\n`, ...lines].join('\n');
  }
}
