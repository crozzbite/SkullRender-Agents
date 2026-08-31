import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');

/**
 * The published bin is bundle/cli.js. If src/ changes and the bundle is not
 * rebuilt, these needles disappear and this test fails — a stale bin cannot
 * silently drop fail-loud loadAll, SAE Task/handoff reject, or pack unknown.
 */
describe('committed bundle/cli.js', () => {
  const bundle = readFileSync(join(ROOT, 'bundle/cli.js'), 'utf8');

  test('includes fail-loud loadAll, SAE Task/handoff reject, pack CallTool unknown', () => {
    expect(bundle).toContain('failed to parse');
    expect(bundle).toContain('must not hold the Task tool');
    expect(bundle).toContain('must not set handoff_owner');
    expect(bundle).toContain('Unknown tool:');
    expect(bundle).toContain('hasPackFiles');
    expect(bundle).not.toContain('malformed files are skipped');
    // yamlText must gate on loadAll().has(id). A bin that keeps fail-loud
    // loadAll but restores skip-on-catch yamlText (see PacksManager) fails here.
    expect(bundle).toContain('loadAll().has(id)');
  });
});
