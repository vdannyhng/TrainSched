// Web-Build für die Veröffentlichung: `expo export -p web` + Content-Security-Policy in dist/index.html.
// Die Supabase-Adresse kommt aus EXPO_PUBLIC_SUPABASE_URL (.env.production.local bzw. Umgebung).
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

function loadEnv() {
  // gleiche Reihenfolge wie Expo im Production-Modus: spätere Dateien überschreiben frühere nicht
  for (const file of ['.env.production.local', '.env.local', '.env.production', '.env']) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
    }
  }
}

loadEnv();
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
if (!supabaseUrl || !/^https:\/\//.test(supabaseUrl)) {
  console.error(
    'EXPO_PUBLIC_SUPABASE_URL muss für den Web-Release eine https-Adresse sein (.env.production.local).',
  );
  process.exit(1);
}
const origin = new URL(supabaseUrl).origin;

const res = spawnSync(
  process.execPath,
  ['node_modules/expo/bin/cli', 'export', '--platform', 'web', '--clear'],
  {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' },
  },
);
if (res.status !== 0) process.exit(res.status ?? 1);

const csp = [
  "default-src 'self'",
  "script-src 'self'",
  // react-native-web erzeugt Styles zur Laufzeit
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${origin}`,
  "font-src 'self' data:",
  `connect-src 'self' ${origin} ${origin.replace('https://', 'wss://')}`,
  "media-src 'self' blob: " + origin,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  'upgrade-insecure-requests',
].join('; ');

const file = 'dist/index.html';
const html = readFileSync(file, 'utf8');
const marker = /<!-- Content-Security-Policy wird beim Web-Build eingesetzt[^>]*-->/;
if (!marker.test(html)) {
  console.error('CSP-Platzhalter in public/index.html nicht gefunden.');
  process.exit(1);
}
writeFileSync(file, html.replace(marker, `<meta http-equiv="Content-Security-Policy" content="${csp}" />`));
console.log(`\nWeb-Build fertig (dist/), CSP für ${origin} gesetzt.`);
