import { describe, expect, test } from 'bun:test';
import { resolveIdentityPrompt } from './resolve-identity.js';
import type { AgentManifest } from './types.js';
import type { PersonalityPack } from './packs-manager.js';

describe('resolveIdentityPrompt', () => {
  test('office only without pack', () => {
    const office: AgentManifest = {
      id: 'SaepAlcance',
      office: 'saep',
      stage: 'scope',
      summary: 'Scope office',
      must: ['Keep one stage'],
      never: ['Skip Go'],
    };
    const text = resolveIdentityPrompt(office, null);
    expect(text).toContain('SaepAlcance');
    expect(text).toContain('No pack injected');
    expect(text).toContain('MUST: Keep one stage');
  });

  test('merges pack voice and never', () => {
    const office: AgentManifest = {
      id: 'SaepIngenieria',
      office: 'saep',
      stage: 'ingenieria',
      personality_pack: 'PackGentleman',
    };
    const pack: PersonalityPack = {
      id: 'PackGentleman',
      kind: 'personality_pack',
      voice: 'SDD apply voice',
      must: ['Prefer Strict TDD'],
      never: ['Override architecture'],
    };
    const text = resolveIdentityPrompt(office, pack);
    expect(text).toContain('PackGentleman');
    expect(text).toContain('SDD apply voice');
    expect(text).toContain('NEVER: Override architecture');
  });
});
