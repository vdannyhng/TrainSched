import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

import { POLICY, policyMarkdown } from '../policy';

const MD_PATH = join(__dirname, '../../../../docs/PRIVACY.md');

describe('Datenschutzerklärung', () => {
  // `npm run privacy:md` schreibt docs/PRIVACY.md neu aus policy.ts
  if (process.env.UPDATE_PRIVACY_MD === '1') writeFileSync(MD_PATH, policyMarkdown() + '\n', 'utf8');

  it('docs/PRIVACY.md entspricht dem Text in der App (sonst: npm run privacy:md)', () => {
    const md = readFileSync(MD_PATH, 'utf8').replace(/\r\n/g, '\n');
    expect(md.trimEnd()).toBe(policyMarkdown().trimEnd());
  });

  it('Deutsch und Vietnamesisch haben dieselbe Gliederung', () => {
    expect(POLICY.vi.sections.map((s) => s.title.split('.')[0])).toEqual(
      POLICY.de.sections.map((s) => s.title.split('.')[0]),
    );
    expect(POLICY.vi.version).toBe(POLICY.de.version);
  });
});
