## Was ändert sich?

<!-- Kurz: Ziel und wichtigste Änderungen -->

## Security- & Privacy-Check (SDLC Phase 1/2)

- [ ] Neue oder geänderte Daten? → Klasse laut `docs/SDLC.md`: <!-- vertraulich / intern / öffentlich -->
- [ ] Wer darf lesen/schreiben? RLS bzw. RPC-Prüfung umgesetzt **und** Negativtest (pgTAP oder `test:abuse`) ergänzt
- [ ] Verlässt etwas das System (Push, Export, Dritte)? → ohne vertrauliche Inhalte
- [ ] Neue Tabelle/Funktion/Edge Function → `docs/THREAT_MODEL.md` ergänzt
- [ ] Datenschutzerklärung betroffen? → `src/features/privacy/policy.ts` + `npm run privacy:md`
- [ ] Keine Secrets im Code, keine neuen `EXPO_PUBLIC_*` mit Geheimnissen

## Gate G2

Alle CI-Jobs grün (App, Datenbank, SAST, Secrets). Ausnahmen nur über `security-exceptions.json` mit Begründung und Ablaufdatum.
