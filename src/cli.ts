#!/usr/bin/env node
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { runMcpServer } from './mcp-server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const [, , command, ...argv] = process.argv;

/** Package root containing manifests/ and schemas/ (default parent of bundled cli). */
export function resolveRepoRoot(): string {
  if (process.env.SKFLOW_ROOT?.trim())
    return path.resolve(process.env.SKFLOW_ROOT.trim());

  if (argv[0] === '--root' && argv[1])
    return path.resolve(argv[1]);

  if (argv[0]?.includes(path.sep) || /^[a-zA-Z]:[\\/]/.test(argv[0] ?? ''))
    return path.resolve(argv[0]);

  return path.resolve(__dirname, '..');
}

async function injectClaudeCode(home = os.homedir()) {
  const configDir = path.join(home, '.claude');
  await fs.promises.mkdir(configDir, { recursive: true });
  const settingsPath = path.join(configDir, 'settings.json');
  let parsed: Record<string, unknown> = {};
  try {
    if (fs.existsSync(settingsPath))
      parsed = JSON.parse(await fs.promises.readFile(settingsPath, 'utf8'));
  } catch {
    parsed = {};
  }
  const mcpServers =
    typeof parsed['mcpServers'] === 'object' && parsed['mcpServers'] !== null
      ? (parsed['mcpServers'] as Record<string, unknown>)
      : {};
  parsed['mcpServers'] = mcpServers;
  const exe = path.resolve(__dirname, 'cli.js');
  const root = resolveRepoRoot();
  (mcpServers as Record<string, unknown>)['skullrender-agents'] = {
    command: 'node',
    args: [exe, 'mcp', root],
    env: { SKFLOW_ROOT: root },
  };
  await fs.promises.writeFile(settingsPath, JSON.stringify(parsed, null, 2), 'utf8');
  console.log(`Merged skullrender-agents MCP into ${settingsPath}`);
}

async function main() {
  const root = resolveRepoRoot();
  const printHelp = () => {
    console.log(`@skullrender/mcp-agents`);
    console.log(`  node bundle/cli.js mcp [<SKFLOW_ROOT> | --root <dir>]   stdio MCP`);
    console.log(`  env SKFLOW_ROOT overrides default root (manifests/schemas parent of bundle/cli.js)`);
    console.log(`  node bundle/cli.js setup claude-code                     merge Claude Code MCP block`);
    console.log(`  Cursor MCP: register manually alongside skullrender-skills (same pattern, different CLI path).`);
  };

  switch (command) {
    case 'mcp':
      await runMcpServer(root);
      break;
    case 'setup':
      switch (argv[0]) {
        case 'claude-code':
          await injectClaudeCode();
          break;
        default:
          console.log(`setup targets: claude-code`);
          printHelp();
      }
      break;
    default:
      printHelp();
  }
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
