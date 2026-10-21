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

| Gate                     | Wann                   | Prüfungen                                                                                                                                                                                                     | Blockiert bei               |
| ------------------------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| **G1 Commit** (lokal)    | vor jedem Commit       | Typecheck, ESLint, Prettier, Secret-Scan (gitleaks)                                                                                                                                                           | jedem Fehler                |
| **G2 Pull Request** (CI) | jeder PR auf `master`  | G1 + Jest + pgTAP (inkl. RLS-Negativtests) + Schema-Check „jede Tabelle hat RLS“ + `expo-doctor` + SAST (CodeQL) + Abhängigkeiten (Dependency Review, `npm audit --omit=dev`) + Secret-Scan über die Historie | Fehler, High/Critical-Funde |
| **G3 Release**           | vor Store-/Web-Release | G2 grün auf dem Release-Commit + Checkliste: Threat Model aktuell, Datenschutzerklärung aktuell, Migrationen geprüft, Supabase Security Advisor ohne Warnungen, Secrets nur in Supabase/EAS                   | offenem Punkt               |

Ausnahmen (z. B. ein bekannter, nicht ausnutzbarer Fund in der Build-Toolchain) werden mit Begründung und Ablaufdatum in `docs/SECURITY_EXCEPTIONS.md` eingetragen.

### 5. Veröffentlichen

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
