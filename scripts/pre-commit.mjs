// SDLC Gate G1: schnelle Prüfungen auf den gestagten Dateien, Typecheck auf dem ganzen Projekt.
// Notfalls überspringen mit `git commit --no-verify` – die Pipeline (G2) prüft trotzdem alles.
import { execFileSync, spawnSync } from 'node:child_process';

const staged = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], {
  encoding: 'utf8',
})
  .split('\n')
  .map((f) => f.trim())
  .filter(Boolean);

if (staged.length === 0) process.exit(0);

const isWin = process.platform === 'win32';
const npx = isWin ? 'npx.cmd' : 'npx';
const run = (label, args) => {
  process.stdout.write(`G1 › ${label} … `);
  const res = spawnSync(npx, args, { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', shell: isWin });
  if (res.status === 0) {
    console.log('ok');
    return true;
  }
  console.log('FEHLER\n' + (res.stdout || '') + (res.stderr || ''));
  return false;
};

const code = staged.filter((f) => /\.(ts|tsx|js|mjs)$/.test(f) && !f.startsWith('supabase/functions/'));
const formattable = staged.filter((f) => /\.(ts|tsx|js|mjs|json|md|yml|yaml|css)$/.test(f));

const results = [
  run('Secret-Scan', ['secretlint', '--maskSecrets', ...staged]),
  formattable.length ? run('Prettier', ['prettier', '--check', ...formattable]) : true,
  code.length ? run('ESLint', ['eslint', '--max-warnings=0', ...code]) : true,
  code.length ? run('Typecheck', ['tsc', '--noEmit']) : true,
];

if (results.includes(false)) {
  console.log('\nCommit abgebrochen (Gate G1). Details siehe docs/SDLC.md.');
  process.exit(1);
}
