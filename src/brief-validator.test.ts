import { describe, expect, test } from 'bun:test';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { BriefValidator } from './brief-validator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

describe('BriefValidator', () => {
  const v = new BriefValidator(ROOT);

  test('valid minimal brief', () => {
    const r = v.validatePayload({
      goal: 'Run tests for SkullRender-Agents',
      constraints: [],
      forbidden_capabilities: ['direct_mcp_calls_by_presentador'],
    });
    expect(r.valid).toBe(true);
    expect(r.errors).toBeUndefined();
  });

  test('reject empty forbidden_capabilities', () => {
    const r = v.validatePayload({
      goal: 'x',
      constraints: [],
      forbidden_capabilities: [],
    });
    expect(r.valid).toBe(false);
    expect(Array.isArray(r.errors)).toBe(true);
  });

  test('reject YAML string missing goal', () => {
    const r = v.validatePayload('constraints: []');
    expect(r.valid).toBe(false);
  });

  test('accept YAML string', () => {
    const yaml = `
goal: Explain architecture
constraints:
  - stay under 400 words
forbidden_capabilities:
  - mutate_files_without_orchestrator
`;
    const r = v.validatePayload(yaml);
    expect(r.valid).toBe(true);
  });
});
