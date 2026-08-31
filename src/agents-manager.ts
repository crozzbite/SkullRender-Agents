import * as fs from 'fs';
import * as path from 'path';
import YAML from 'yaml';
import type { AgentManifest } from './types.js';

export interface OfficeTree {
  /** Spine ids (Facade, PMO, Orquestador…), sorted. */
  spine: string[];
  /** Stage offices with the Saes reporting to each, sorted. */
  saeps: Array<{ id: string; saes: string[] }>;
  /** Manifests outside the spine/Saep/Sae layering (legacy wrappers, packs). */
  other: string[];
}

/**
 * A Sae must report to a Saep. Reporting to spine, to another Sae, or to a
 * missing id means the delegation chain lies about who owns the stage handoff,
 * so it is rejected instead of being silently listed.
 *
 * A Sae must not hold Task or own a handoff: those belong to the parent Saep.
 */
function assertSaeParents(map: Map<string, AgentManifest>): void {
  for (const manifest of map.values()) {
    if (manifest.office !== 'sae') continue;
    const parentId = manifest.reports_to;
    if (!parentId) {
      throw new Error(
        `AgentsManager: Sae ${manifest.id} has no reports_to; a Sae must report to a Saep.`,
      );
    }
    const parent = map.get(parentId);
    if (!parent) {
      throw new Error(
        `AgentsManager: Sae ${manifest.id} reports to ${parentId}, which is not a loaded manifest.`,
      );
    }
    if (parent.office !== 'saep') {
      throw new Error(
        `AgentsManager: Sae ${manifest.id} reports to ${parentId} (office: ${parent.office ?? 'unset'}); a Sae must report to a Saep.`,
      );
    }
    const tools = manifest.permissions?.tools ?? [];
    if (tools.includes('Task')) {
      throw new Error(
        `AgentsManager: Sae ${manifest.id} must not hold the Task tool; a Sae produces evidence and does not re-delegate.`,
      );
    }
    if (manifest.handoff_owner === true) {
      throw new Error(
        `AgentsManager: Sae ${manifest.id} must not set handoff_owner; a Sae never hands off to PMO.`,
      );
    }
  }
}

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

  /**
   * Load all manifests. A file that cannot be parsed, has no `id`, or reuses an
   * `id` already loaded from another file fails the load. A broken Sae → Saep
   * delegation chain also throws: see `assertSaeParents`.
   */
  loadAll(): Map<string, AgentManifest> {
    const map = new Map<string, AgentManifest>();
    for (const filePath of this.listIds()) {
      let data: AgentManifest;
      try {
        const raw = fs.readFileSync(filePath, 'utf8');
        data = YAML.parse(raw) as AgentManifest;
      } catch (e) {
        const detail = e instanceof Error ? e.message : String(e);
        throw new Error(`AgentsManager: failed to parse ${filePath}: ${detail}`);
      }
      if (!data?.id || typeof data.id !== 'string') {
        throw new Error(`AgentsManager: missing id in ${filePath}`);
      }
      if (map.has(data.id)) {
        throw new Error(`AgentsManager: duplicate id ${data.id} in ${filePath}`);
      }
      map.set(data.id, data);
    }
    assertSaeParents(map);
    return map;
  }

  /** Spine / Saep / Sae layering, for callers that need who-reports-to-whom. */
  officeTree(): OfficeTree {
    const all = this.loadAll();
    const byId = (a: string, b: string) => a.localeCompare(b);
    const spine: string[] = [];
    const other: string[] = [];
    const saesByParent = new Map<string, string[]>();
    const saepIds: string[] = [];

    for (const m of all.values()) {
      switch (m.office) {
        case 'spine':
          spine.push(m.id);
          break;
        case 'saep':
          saepIds.push(m.id);
          break;
        case 'sae':
          saesByParent.set(m.reports_to!, [
            ...(saesByParent.get(m.reports_to!) ?? []),
            m.id,
          ]);
          break;
        default:
          other.push(m.id);
      }
    }

    return {
      spine: spine.sort(byId),
      saeps: saepIds.sort(byId).map((id) => ({
        id,
        saes: (saesByParent.get(id) ?? []).sort(byId),
      })),
      other: other.sort(byId),
    };
  }

  getAgent(id: string): AgentManifest | undefined {
    return this.loadAll().get(id);
  }

  formatList(): string {
    const all = this.loadAll();
    if (all.size === 0) return 'No manifests found.';

    const entry = (id: string, indent: string): string => {
      const m = all.get(id)!;
      const dn = m.display_name ?? m.id;
      const sm = typeof m.summary === 'string' ? m.summary.trim().split('\n')[0] ?? '' : '';
      return `${indent}- **${m.id}** — ${dn}\n${indent}  ${sm}`;
    };

    const tree = this.officeTree();
    const lines: string[] = [];
    for (const id of tree.spine) lines.push(entry(id, ''));
    for (const saep of tree.saeps) {
      lines.push(entry(saep.id, ''));
      for (const sae of saep.saes) lines.push(entry(sae, '  '));
    }
    for (const id of tree.other) lines.push(entry(id, ''));

    return [`# Agents (${all.size})\n`, ...lines].join('\n');
  }

  yamlText(id: string): string | null {
    if (!this.loadAll().has(id)) return null;
    for (const fp of this.listIds()) {
      const raw = fs.readFileSync(fp, 'utf8');
      const data = YAML.parse(raw) as AgentManifest;
      if (data?.id === id) return raw;
    }
    return null;
  }
}
