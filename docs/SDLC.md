# TrainSched – Secure Development Lifecycle (SDLC)

Stand: 2026-10-21 · Gilt für jede Änderung an App, Datenbank und Edge Functions.

Leichtgewichtig für ein Ein-Personen-Projekt (mit KI-Unterstützung), angelehnt an
**NIST SSDF (SP 800-218)**, **OWASP ASVS Level 2** (Backend) und **OWASP MASVS** (Mobile).
Grundsatz: Was automatisch prüfbar ist, prüft die Pipeline – Handarbeit nur dort, wo Urteil nötig ist.

## Warum

- Die App verarbeitet Daten von Schülerinnen und Schülern, teils Minderjährigen (Notizen, Dateien, Anwesenheit).
- Es gibt kein Vier-Augen-Prinzip im Team – Gates und Tests ersetzen das fehlende Review.
- Rechte werden ausschliesslich serverseitig (RLS, RPCs) durchgesetzt. Ein Fehler dort ist ein Datenleck.

## Datenklassifizierung

| Klasse          | Beispiele                                                                  | Anforderungen                                                   |
| --------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **Vertraulich** | Notizen, Anhänge, Anwesenheit, Kontakte Erziehungsberechtigte, Fortschritt | RLS + Negativtest, nie in Logs/Pushes, Export nur RLS-gefiltert |
| **Intern**      | Termine, Themen, Profile, Push-Tokens                                      | RLS + Negativtest                                               |
| **Öffentlich**  | Publishable Key, App-Texte, Datenschutzerklärung                           | –                                                               |
| **Geheim**      | Service-Role-Key, Push-Dispatch-Secret, Store-/APNs-/FCM-Schlüssel         | nur in Supabase/EAS-Secrets, nie im Repo, Rotation dokumentiert |

## Phasen

### 1. Planen

- Jede Änderung startet als Eintrag in der Roadmap bzw. als Issue mit Ziel und Akzeptanzkriterien.
- **Security- & Privacy-Check (5 Fragen):** Neue Daten? Welche Klasse? Wer darf lesen und schreiben? Verlässt etwas das System (Push, Export, Dritte)? Muss die Datenschutzerklärung angepasst werden?

### 2. Entwerfen

- Bei neuen Tabellen, RPCs, Edge Functions oder Datenflüssen: **Threat Model light (STRIDE)** in `docs/THREAT_MODEL.md` ergänzen – Bedrohung, Gegenmassnahme, Test.
- Rechte immer zuerst als RLS-Policy bzw. geprüfte RPC entwerfen, die App-UI ist nur Komfort.

### 3. Umsetzen – verbindliche Regeln

- Jede Tabelle in `public`: `enable row level security`, `revoke all … from anon, authenticated`, danach nur gezielte Grants.
- `security definer` nur mit `set search_path = ''` und expliziter Rechteprüfung; Prüfungen NULL-sicher (`coalesce(…, false)`).
- Schreiben in sensible Tabellen nur über RPCs mit Rechteprüfung.
- Keine Secrets im Code, in `app.json` oder in `EXPO_PUBLIC_*`-Variablen.
- Keine vertraulichen Inhalte in Push-Texten, Logs oder Fehlermeldungen.
- Neue Pakete nur über `npx expo install`, mit kurzer Prüfung (Pflege, Downloads, Lizenz).

### 4. Prüfen – Security Gates

| Gate                     | Wann                                                        | Prüfungen                                                                                                                                                                                                                                                           | Blockiert bei                                           |
| ------------------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| **G1 Commit** (lokal)    | vor jedem Commit (`.githooks/pre-commit`)                   | Secret-Scan (secretlint), Prettier, ESLint (0 Warnungen) auf gestagten Dateien, Typecheck                                                                                                                                                                           | jedem Fehler                                            |
| **G2 Pull Request** (CI) | jeder PR und Push auf `master` (`.github/workflows/ci.yml`) | **App:** Typecheck, Lint, Prettier, Jest, `expo-doctor`, Audit-Gate, secretlint · **Datenbank:** frische Supabase, pgTAP inkl. Security-Baseline, Missbrauchstests gegen API und Edge Functions · **SAST:** Semgrep · **Secrets:** gitleaks über die ganze Historie | Fehler, neue High/Critical-Funde, abgelaufene Ausnahmen |
| **G3 Release**           | vor Store-/Web-Release (Issue-Vorlage „Release“)            | G2 grün auf dem Release-Commit + Checkliste: Threat Model, Datenschutzerklärung, Migrationen, Supabase Security Advisor, Auth-Einstellungen, Secrets, Ausnahmen, Backup                                                                                             | offenem Punkt                                           |

Ausnahmen (z. B. ein bekannter, nicht ausnutzbarer Fund in der Build-Toolchain) stehen mit Begründung und Ablaufdatum in `security-exceptions.json` (maschinenlesbar, vom Audit-Gate geprüft) und `docs/SECURITY_EXCEPTIONS.md`.

**SAST doppelt:** Semgrep (schnell, Community-Regeln) und CodeQL (`security-extended`, auch wöchentlich). **Abhängigkeiten doppelt:** Audit-Gate auf dem ganzen Baum und Dependency Review für neu hinzukommende Pakete im PR. Beides ist gratis, weil das Repo öffentlich ist.

**Branch-Schutz:** `master` nimmt nur Pull Requests mit allen grünen Pflicht-Checks an (GitHub-Branch-Schutz, gilt auch für Admins, keine Force-Pushes). Zusätzlich lehnt der lokale Hook `.githooks/pre-push` direkte Pushes ab. Rollen: Claude entwickelt und öffnet PRs, du reviewst und mergst.

**Lokal ausführen:** `npm run check`, `npm test`, `npm run test:db`, `npm run test:abuse` (braucht `npm run functions:serve`), `npm run audit:gate`, `npm run test:secrets`.

### 5. Veröffentlichen

- **Website:** automatisch nach jedem Merge auf `master` (CI-Job „Web veröffentlichen“, läuft nur, wenn App, Datenbank, SAST und Secrets grün sind; Umgebung `production` mit `EXPO_TOKEN`).
- **Datenbank:** Migrationen bewusst manuell (`npx supabase db push`, nie mit Seed) – vor dem App-Deploy, rückwärtskompatibel.

- Nur getaggte Commits (`v0.x.y`) von `master` werden gebaut (EAS) bzw. deployt (Supabase, Web).
- Datenbank-Migrationen vor dem App-Release einspielen, rückwärtskompatibel halten.

### 6. Betreiben

- **Updates:** Dependabot (wöchentlich), Expo-SDK-Update spätestens 2 Monate nach Erscheinen.
- **Überwachung:** Supabase Security Advisor monatlich, Logs der Edge Functions bei Auffälligkeiten.
- **Backups:** tägliche Backups des Supabase-Projekts (Pro-Tarif), Wiederherstellung einmal jährlich testen.
- **Vorfälle:** `docs/INCIDENT.md` – Kurzablauf: eindämmen (Konto pausieren, Schlüssel rotieren), Umfang klären, Betroffene und ggf. EDÖB informieren (bei hohem Risiko möglichst rasch), Ursache beheben, Test ergänzen.
- **Schwachstellen melden:** `SECURITY.md` im Repo mit Kontaktadresse.

### 7. Ausmustern

- Konto- und Datenlöschung sind in der App umgesetzt (M7). Beim Einstellen des Dienstes: Export anbieten, Frist kommunizieren, Projekt und Backups löschen.

## Rollen

Eine Person (du) ist Product Owner, Entwickler und Security Owner. Claude setzt um und prüft; Freigaben (G3, Ausnahmen, Releases) triffst du.
