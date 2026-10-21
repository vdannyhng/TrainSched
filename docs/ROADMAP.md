# TrainSched – Roadmap

Stand: 2026-10-21 · Status: freigegeben · **M1 ✅ · M2 ✅ · M3 ✅ · M4 ✅ · M5 ✅ · M6 ✅ · M7 ✅ · M8 ✅** · M9 Store

## Definition of Done (gilt für jeden Meilenstein)

- Läuft auf Android und iOS (Expo Go bis M4, ab M5 Dev Build wegen Push).
- `npm run check` ist grün: `tsc --noEmit`, ESLint, Prettier.
- `npm test` (Jest) und `supabase test db` (pgTAP) sind grün.
- Jeder neue UI-Text läuft über i18n-Keys (`de.json`, für `vi.json` mindestens ein Platzhalter).
- README mit Setup-Schritten ist aktualisiert.
- Ein Commit (Conventional Commits, z. B. `feat(lessons): recurring series with DST-safe expansion`).
- Ab M8: Security Gates aus [docs/SDLC.md](SDLC.md) sind grün (G1/G2 je Änderung, G3 vor jedem Release).

Legende: **[Du]** = Schritt, den du manuell machen musst (Konten, Schlüssel, Gerätetest).

---

## M1 – Fundament: Setup, Auth, Rollen, Einladungen, RLS ✅

- Expo-Projekt (TS strict, Expo Router, Alias `@/`), ESLint, Prettier, Jest und RNTL einrichten.
- Theme-Tokens (hell/dunkel), Schrift Be Vietnam Pro, Basis-UI-Komponenten (Button, Input, EmptyState, ErrorState).
- i18n-Gerüst (`de` vollständig, `vi` als Gerüst); Sprache folgt `profiles.locale`, sonst dem Gerät.
- Supabase lokal (`supabase init`/`start`): Migrationen für `profiles`, `teacher_settings`, `invitations`, `students` (Minimalfelder), Helper-Funktionen, RLS.
- Edge Function `accept-invite`, Screens für Login, Einladung einlösen, Passwort vergessen/zurücksetzen und Einwilligung.
- Rollenbasiertes Routing: `(teacher)` bzw. `(student)`, jeweils mit leeren Tab-Gerüsten.
- Generierte DB-Typen, `.env.example`.
- **Tests:** pgTAP für RLS (Schüler sieht nur sich, Lehrer sieht nur eigene Schüler, Admin sieht alles, eingelöste oder abgelaufene Einladung wird abgelehnt), Jest für Zod-Schemas und Auth-Redirect.
- **[Du]:** Supabase-Konto + Projekt in EU-Region und Expo-Konto anlegen (für Cloud-Betrieb, lokal läuft alles ohne). Node 24 und Docker Desktop sind installiert.

## M2 – Schülerverwaltung + Tags ✅

- Schülerliste (FlashList, Suche, Filter nach Status/Level/Topic), Detailseite, Anlegen/Bearbeiten (RHF + Zod).
- Status aktiv/inaktiv/archiviert; archivierte Schüler sind standardmässig ausgeblendet.
- Kontaktdaten der Erziehungsberechtigten + Einwilligungsflag bei `is_minor`.
- Einladung aus dem Schülerprofil erzeugen und teilen (Teilen-Sheet mit Link + Code).
- Level A1–B2 als feste Werte mit festen Farben + frei anlegbare Themen mit Farbe; farbige Chips mit automatischem Textkontrast.
- Diakritik-tolerante Suche („Huong“ findet „Hương“), Admin kann Lehrer einladen, Schüler sehen „Mein Kurs“ im Profil.
- „Lehrernotiz zum Schüler“ als Vorgriff auf `notes` (`visibility = teacher`).
- **Tests:** RLS für `students`/`tags`/`student_tags`, Komponententests für Formular-Validierung und Chip-Kontrast.

## M3 – Termine (Kern der App) ✅

- Migrationen `lesson_series`, `lessons`, `lesson_participants`, `lesson_tags`, Exclusion-Constraint, `materialize_series`, `check_conflicts`, `pg_cron`-Verlängerung.
- Startscreen Lehrer „Heute / Diese Woche“ mit Schnellaktionen (Verschieben in ≤3 Taps, Gehalten, Notiz).
- Kalender Tag/Woche/Monat (Spike: calendar-kit vs. eigene Timeline), Filter nach Schüler/Level/Topic.
- Termin anlegen: einzeln oder Serie (wöchentlich/zweiwöchentlich), Einzel- oder Gruppentermin, Online mit Link oder vor Ort, Dauer.
- Bearbeiten: „nur dieser“ oder „dieser und folgende“; Verschieben; Absagen mit Grund; als gehalten markieren inkl. Anwesenheit.
- Konfliktwarnung inkl. Pufferzeit (einstellbar unter Einstellungen), Konfliktliste vor dem Speichern einer Serie.
- Anzeige in der Zeitzone des Betrachters, Doppelanzeige bei abweichender Zeitzone.
- Schüleransicht: eigene Termine (Liste), Termindetails.
- ICS-Export eines Termins über das Teilen-Sheet.
- **Zusatz:** Konten pausieren (Lehrer → eigene Schüler, Admin → alle), serverseitig per RLS; Pufferzeit in den Kontoeinstellungen.
- Notiz-Schnellaktion auf der Terminkarte folgt mit den Termin-Notizen in M4.
- **Nachgereicht:** Blocker für private Zeiten (einmalig/wöchentlich, nur für Lehrkräfte), kompakte Wochenansicht ohne Scrollen, Tag immer als Zeitleiste, langes Drücken zum Anlegen.
- **Tests:** pgTAP für Serienexpansion (DST März/Oktober, Jahreswechsel, zweiwöchentlich, Ausnahmen, Serie teilen), Konflikte, RLS (Schüler sieht nur Termine mit eigener Teilnahme und in der Gruppe nur den eigenen Teilnehmereintrag); Jest für `time.ts` (Zürich/Berlin/Hanoi) und Datumsformatierung.

## M4 – Notizen, Anhänge, Hausaufgaben ✅

- Notizen pro Termin und pro Schüler, Umschalter „für Schüler sichtbar“ / „nur Lehrer“, Markdown-light (fett, kursiv, Listen, Links) mit eigenem schlanken Renderer.
- Anhänge: Kamera (komprimiert), Galerie, PDF, Audio; privater Storage-Bucket, Signed URLs, Upload-Fortschritt.
- Volltextsuche (diakritik-tolerant) + Filter Schüler/Level/Topic/Datum, paginiert.
- Hausaufgaben pro Termin und Schüler, Fälligkeit, Schüler hakt ab (RPC).
- „Letzte Stunde in 1 Minute“: Die Termindetailseite zeigt Notizen und Hausaufgaben der vorherigen Stunde. Das kostet kaum Aufwand und hilft im Alltag stark, deshalb ist es ins MVP vorgezogen.
- Schüleransicht: Tabs Hausaufgaben und Materialien.
- **Tests:** RLS + Storage-Policies (Schüler sieht keine Lehrernotiz und keinen Lehrer-Anhang), Suche mit vietnamesischen Diakritika, Markdown-Renderer.

## M5 – Push-Benachrichtigungen + Anfragen-Workflow ✅

- Dev Build via EAS (`development`-Profil); Push-Token registrieren und verwalten.
- Erinnerungen vor Terminen (pro Nutzer konfigurierbar, Standard 24 h + 1 h) über `pg_cron` und Edge Function.
- Event-Pushes über Outbox: verschoben, abgesagt, neue Anfrage, Anfrage entschieden.
- Schüler: Verschieben/Absagen anfragen, mit bis zu 3 Alternativ-Slots; Hinweis bei unterschrittener Absagefrist.
- Lehrer: Tab „Anfragen“ mit Badge; annehmen (Slot wählen → Termin wird verschoben, mit Konfliktprüfung) oder ablehnen mit Antwort.
- **Tests:** pgTAP für Anfrage-RLS und Statusübergänge, Erinnerungsfenster-Logik und Dedupe (als SQL-Funktion testbar); Jest für Anfrage-Formular.
- **[Du]:** Apple Developer + Google Play Konten (für APNs/FCM-Credentials), Gerätetest der Pushes.
- **Umgesetzt:** Outbox mit Dedupe, Versand per `pg_net` → Edge Function `send-push` → Expo Push Service (Texte in Sprache und Zeitzone des Empfängers, ungültige Geräte werden entfernt). Absage im Gruppentermin entschuldigt nur die anfragende Person. Konfliktanzeige pro vorgeschlagenem Slot. Erinnerungen 15 Min. bis 2 Tage frei wählbar.
- **Vorgezogen aus M6:** Level-Verlauf wird seit 2026-10-17 per Trigger protokolliert (`student_level_changes`).
- **[Du] offen:** `eas init` (Expo-Konto) für die Projekt-ID, danach Push auf dem iPhone in Expo Go testen; Android braucht einen Dev Build.

**→ Nach M5 ist das MVP komplett.**

## M6 – Lernfortschritt ✅

- Fortschritt pro Schüler: Level-Verlauf (wann von A2 auf B1 usw.), behandelte Topics, Anwesenheits- und Absagequote.
- Abrechnung (Stundensätze, Pakete, Zahlungen) ist bewusst gestrichen – wird nicht gebraucht.
- **Tests:** Berechnung der Quoten, Level-Verlauf, RLS (Schüler sieht nur den eigenen Fortschritt).
- **Umgesetzt:** RPC `student_progress` (Zeitraum 3 Monate / 12 Monate / gesamt). Karte „Lernfortschritt“ beim Schüler (Lehrkraft) und im Profil (Schüler): Unterrichtsstunden, Anwesenheits- und Absagequote (davon auf Anfrage/kurzfristig), Level-Zeitleiste, Themen als Balken. Hinweis für die Lehrkraft, wenn vergangene Termine noch nicht als gehalten markiert sind.
- **Nebenbei:** Im Entwicklungsmodus nimmt die App die Supabase-Adresse vom Expo-Dev-Server – ein IP-Wechsel des PCs bricht das Handy-Testen nicht mehr.

## M7 – Zweisprachigkeit, Politur, Datenschutz-Komplettierung ✅

- Vietnamesische Übersetzung vollständig (von deiner Freundin gegengelesen), Sprachumschalter, Diakritika-Test auf beiden Plattformen.
- Dark Mode final, Barrierefreiheits-Check (Font-Scaling 200 %, Screenreader-Labels, Kontraste).
- Offline-Lesezugriff (persistierter Query-Cache) auf Termine und Notizen.
- Konto löschen (Schüler selbst / Lehrer für Schüler), Datenexport (JSON + Anhänge), Datenschutzerklärung (`docs/PRIVACY.md` + In-App).
- Optional: Apple/Google Sign-In als Verknüpfung bestehender Konten.
- **Umgesetzt:** Konto löschen über Edge Function `delete-account` (Schüler: Login weg, Lehrkraft wird informiert; Lehrkraft für Schüler: Datensatz, Dateien, Login; Lehrkraft selbst: alles inkl. Schüler-Logins; Admin gesperrt). Datenexport als JSON (RLS-gefiltert, 7 Tage gültige Datei-Links). Datenschutzerklärung DE/VI in der App (`/privacy`, auch vor dem Login) und als `docs/PRIVACY.md` (aus derselben Quelle, `npm run privacy:md`). Offline-Lesen per persistiertem Query-Cache (7 Tage, beim Abmelden gelöscht) mit Offline-Hinweis. Kontrast-Test für hell/dunkel (WCAG AA).
- **Offen [Du]:** Vietnamesisch durch deine Freundin gegenlesen lassen; Platzhalter für Anbieter/Adresse/E-Mail in `src/features/privacy/policy.ts` ausfüllen und rechtlich prüfen lassen. Apple/Google Sign-In bewusst weggelassen (optional).

## M8 – Security, SDLC & CI-Pipeline ✅

Ziel: Der Prozess aus [docs/SDLC.md](SDLC.md) läuft automatisch – nichts Ungeprüftes landet auf `master` oder in einem Release.

- **Arbeitsweise:** Feature-Branches + Pull Requests, Branch-Schutz auf `master` (nur mit grüner Pipeline), Releases nur über Tags.
- **Gate G1 (lokal):** Pre-Commit-Hook mit Typecheck, ESLint, Prettier und Secret-Scan (gitleaks).
- **Gate G2 (GitHub Actions):** Jest, pgTAP gegen eine frische Supabase in CI, Schema-Check „jede Tabelle hat RLS und keine offenen Grants“, `expo-doctor`, CodeQL (SAST), Dependency Review, `npm audit` für Produktionsabhängigkeiten, gitleaks über die Historie. Dependabot für Updates.
- **Gate G3 (Release):** Checkliste im Release-PR (Threat Model, Datenschutzerklärung, Migrationen, Supabase Security Advisor, Secrets).
- **Threat Model** `docs/THREAT_MODEL.md` (STRIDE light) für Login/Einladung, RLS, Storage, Edge Functions, Push, Offline-Cache. Bekannte Prüfpunkte:
  - Sitzung und Offline-Cache liegen auf dem Gerät **unverschlüsselt** (expo-sqlite) → auf `expo-secure-store` bzw. verschlüsselten Speicher umstellen (MASVS-STORAGE).
  - Rate-Limits für Login und Einladungscodes (Brute Force) prüfen und dokumentieren.
  - Rotation von Push-Dispatch-Secret und Service-Role-Key beschreiben.
  - Bekannte `npm audit`-Funde der Expo-Toolchain bewerten → `docs/SECURITY_EXCEPTIONS.md`.
- **Missbrauchstests:** automatisierte Skripte, die als fremder Lehrer/Schüler versuchen, Daten zu lesen, zu ändern oder zu löschen (wie die Lösch-Tests aus M7), fest in der Pipeline.
- `SECURITY.md` (Meldeweg für Schwachstellen), `docs/INCIDENT.md` (Ablauf bei Vorfällen).
- **Tests:** Die Pipeline selbst ist der Test – ein absichtlich eingebauter Fehler (Tabelle ohne RLS, Secret im Code, fehlschlagender Test) muss den PR blockieren.
- **[Du]:** Branch-Schutz in den GitHub-Einstellungen bestätigen, ggf. GitHub Advanced Security/CodeQL für das Repo aktivieren (für öffentliche Repos gratis).
- **Umgesetzt:** Pre-Commit-Hook (secretlint, Prettier, ESLint, Typecheck); GitHub Actions mit vier Jobs (App inkl. Audit-Gate, Datenbank inkl. Security-Baseline und 36 Missbrauchstests, Semgrep, gitleaks); Dependabot; PR- und Release-Vorlagen; `docs/THREAT_MODEL.md` (19 Bedrohungen mit Nachweis), `SECURITY.md`, `docs/INCIDENT.md`, `docs/SECURITY_EXCEPTIONS.md`.
- **Behoben:** Sitzung und Offline-Cache auf dem Handy jetzt AES-256-GCM-verschlüsselt (Schlüssel im Keychain/Keystore); Brute-Force-Schutz für Einladungscodes; Online-Raum-Links per DB-Constraint nur http(s); Passwortänderung nur nach frischem Login, Reset-Mails max. 1/Minute.
- **Repo öffentlich (2026-10-21):** dadurch zusätzlich CodeQL, Dependency Review und echter Branch-Schutz auf `master`.

## W – Web-Release (vor M9) ✅

Ziel: Die App läuft öffentlich als Website und lässt sich auf dem Handy „Zum Home-Bildschirm“ hinzufügen (PWA) – ohne Store und ohne Expo Go.

- Supabase-Projekt in der Cloud (EU), Migrationen, Edge Functions, Secrets und Vault eingerichtet; Registrierung aus, Redirect-URLs für Passwort-Reset.
- Web-Build mit Content-Security-Policy (`npm run build:web`), Hosting über EAS Hosting (`npm run deploy:web`, Adresse `*.expo.app`, eigene Domain optional).
- PWA: Manifest, Icons (vietnamesische Flagge + Kalender), Apple-Touch-Icon, Vollbild auf dem Home-Bildschirm.
- Web-Sicherheit: kein Offline-Cache im Browser (kein sicherer Schlüsselspeicher), Push nur in der Handy-App.
- **[Du]:** Supabase-Projekt anlegen und `supabase login`; eigenes Konto als Admin anlegen; Datenschutz-Platzhalter ausfüllen (Pflicht vor echten Schülerdaten).
- **Live (2026-10-21):** https://trainsched.expo.app – Supabase `jlrcdqgiwyneykaijqpm` (eu-west-1, Irland), 19 Migrationen ohne Seed, 3 Edge Functions, Registrierung gesperrt (geprüft), Redirect-URLs über `[remotes.production]` in `supabase/config.toml`.

## M9 – Store-Release

- `eas.json`-Profile, App-Icons, Splash, Bundle-IDs, Versionierung, EAS Update (OTA) für Bugfixes.
- Store-Texte DE/VI, Screenshots, Datenschutz-Angaben (App Privacy / Data Safety), Demo-Zugang für das Apple-Review.
- TestFlight und Play Internal Testing mit deiner Freundin und 1–2 Schülern, dann Einreichung.
- **[Du]:** Store-Einträge anlegen, rechtliche Angaben (Impressum/Anbieter), Einreichung bestätigen.

---

## Backlog nach Release (priorisiert)

1. **Verfügbarkeiten** der Lehrerin + Schüler fragt freie Slots direkt an (baut auf dem Anfragen-Workflow aus M5 auf).
2. **ICS-Abo-Feed** (pro Nutzer geheimer URL-Token, Edge Function) für Google/Apple Kalender.
3. **Material-/Vokabel-Bibliothek** nach Level/Topic, Schülern zuweisbar.
4. Gruppen als eigene Entität (feste Gruppen mit Namen), falls Gruppenunterricht häufig wird.

## Offene Punkte / Risiken

- **Kalender-Library:** In M3 entscheidet ein Spike. Wenn keine Library Tag, Woche und Monat sauber mit Dark Mode und Font-Scaling kann, wird ein eigener Timeline-View gebaut (+1–2 Tage).
- **Lokale Supabase unter Windows** braucht Docker Desktop mit WSL2. Alternative: SQL-Tests gegen ein separates Supabase-Testprojekt.
- **Push** ist nur auf echten Geräten mit Dev Build testbar, nicht im Simulator/Expo Go (Android).
