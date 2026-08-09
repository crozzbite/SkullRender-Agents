import type { AgentManifest } from './types.js';
import type { PersonalityPack } from './packs-manager.js';

/** Merge office identity + optional personality pack into a prompt block for Cursor/LLM. */
export function resolveIdentityPrompt(
  office: AgentManifest,
  pack?: PersonalityPack | null,
): string {
  const lines: string[] = [];
  lines.push(`# Identity: ${office.id}`);
  if (office.display_name) lines.push(`Display: ${office.display_name}`);
  if (office.office) lines.push(`Office kind: ${office.office}`);
  if (office.stage) lines.push(`SDLC stage: ${office.stage}`);
  if (office.reports_to) lines.push(`Reports to: ${office.reports_to}`);
  if (office.handoff_owner) lines.push(`Handoff owner: yes`);
  if (office.summary) {
    lines.push('', '## Office summary', String(office.summary).trim());
  }
  if (office.rasci_rows?.length) {
    lines.push('', '## RASCI rows', office.rasci_rows.map((r) => `- ${r}`).join('\n'));
  }
  if (office.permissions) {
    lines.push('', '## Permissions (office)');
    const p = office.permissions;
    if (p.tools?.length) lines.push(`tools: ${p.tools.join(', ')}`);
    if (p.mcp?.length) lines.push(`mcp: ${p.mcp.join(', ')}`);
    if (p.skills?.length) lines.push(`skills: ${p.skills.join(', ')}`);
    if (p.rules?.length) lines.push(`rules: ${p.rules.join(', ')}`);
  }
  const officeMust = office.must ?? [];
  const officeNever = office.never ?? [];
  if (officeMust.length || officeNever.length) {
    lines.push('', '## Office must / never');
    for (const m of officeMust) lines.push(`MUST: ${m}`);
    for (const n of officeNever) lines.push(`NEVER: ${n}`);
  }

  if (pack) {
    lines.push('', `# Personality pack injected: ${pack.id}`);
    if (pack.display_name) lines.push(`Pack display: ${pack.display_name}`);
    if (pack.voice) lines.push('', '## Voice', String(pack.voice).trim());
    lines.push('', '## Pack must / never');
    for (const m of pack.must ?? []) lines.push(`MUST: ${m}`);
    for (const n of pack.never ?? []) lines.push(`NEVER: ${n}`);
  } else {
    lines.push('', '## Personality', 'No pack injected (office-only run).');
  }

  lines.push(
    '',
    '## Legion runtime rules',
    '- One SDLC stage active at a time.',
    '- Saes work in parallel under Saep; report to Saep; only Saep/spine emit stage handoff.',
    '- Do not act as a second Orquestador.',
  );

  return lines.join('\n');
}
