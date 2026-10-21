// SDLC Gate G2: npm audit für Produktionsabhängigkeiten.
// Blockiert jeden High/Critical-Fund, der nicht in security-exceptions.json steht – und abgelaufene Ausnahmen.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Über `npm run audit:gate` gestartet → npm_execpath zeigt auf npm-cli.js (kein Shell-Aufruf nötig)
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Bitte über `npm run audit:gate` starten.');
const res = spawnSync(process.execPath, [npmCli, 'audit', '--omit=dev', '--json'], {
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
});
const report = JSON.parse(res.stdout);
const { advisories: exceptions } = JSON.parse(readFileSync('security-exceptions.json', 'utf8'));
const today = new Date().toISOString().slice(0, 10);

const found = new Map();
for (const vuln of Object.values(report.vulnerabilities ?? {})) {
  for (const via of vuln.via ?? []) {
    if (typeof via !== 'object') continue;
    const id = via.url?.split('/').pop();
    if (id) found.set(id, { id, package: via.name, severity: via.severity, title: via.title });
  }
}

let failed = false;
for (const adv of found.values()) {
  const blocking = adv.severity === 'high' || adv.severity === 'critical';
  const exception = exceptions.find((e) => e.id === adv.id);
  if (exception && exception.expires < today) {
    console.log(`✗ Ausnahme abgelaufen (${exception.expires}): ${adv.id} ${adv.package} – neu bewerten`);
    failed = true;
  } else if (blocking && !exception) {
    console.log(`✗ ${adv.severity.toUpperCase()} ${adv.id} ${adv.package}: ${adv.title}`);
    failed = true;
  } else {
    console.log(
      `· ${adv.severity} ${adv.id} ${adv.package}${exception ? ' (Ausnahme bis ' + exception.expires + ')' : ''}`,
    );
  }
}
for (const e of exceptions) {
  if (!found.has(e.id))
    console.log(
      `ℹ Ausnahme ${e.id} (${e.package}) wird nicht mehr gebraucht – aus security-exceptions.json entfernen`,
    );
}
console.log(failed ? '\nAudit-Gate: FEHLGESCHLAGEN' : '\nAudit-Gate: ok');
process.exit(failed ? 1 : 0);
