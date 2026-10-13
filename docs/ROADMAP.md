# TrainSched – Roadmap

Stand: 2026-10-13 · Status: freigegeben · **M1 ✅ · M2 ✅ · M3 ✅ · M4 ✅**

## Definition of Done (gilt für jeden Meilenstein)

- Läuft auf Android und iOS (Expo Go bis M4, ab M5 Dev Build wegen Push).
- `npm run check` ist grün: `tsc --noEmit`, ESLint, Prettier.
- `npm test` (Jest) und `supabase test db` (pgTAP) sind grün.
- Jeder neue UI-Text läuft über i18n-Keys (`de.json`, für `vi.json` mindestens ein Platzhalter).
- README mit Setup-Schritten ist aktualisiert.
- Ein Commit (Conventional Commits, z. B. `feat(lessons): recurring series with DST-safe expansion`).

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

## M5 – Push-Benachrichtigungen + Anfragen-Workflow

- Dev Build via EAS (`development`-Profil); Push-Token registrieren und verwalten.
- Erinnerungen vor Terminen (pro Nutzer konfigurierbar, Standard 24 h + 1 h) über `pg_cron` und Edge Function.
- Event-Pushes über Outbox: verschoben, abgesagt, neue Anfrage, Anfrage entschieden.
- Schüler: Verschieben/Absagen anfragen, mit bis zu 3 Alternativ-Slots; Hinweis bei unterschrittener Absagefrist.
- Lehrer: Tab „Anfragen“ mit Badge; annehmen (Slot wählen → Termin wird verschoben, mit Konfliktprüfung) oder ablehnen mit Antwort.
- **Tests:** pgTAP für Anfrage-RLS und Statusübergänge, Erinnerungsfenster-Logik und Dedupe (als SQL-Funktion testbar); Jest für Anfrage-Formular.
- **[Du]:** Apple Developer + Google Play Konten (für APNs/FCM-Credentials), Gerätetest der Pushes.

**→ Nach M5 ist das MVP komplett.**

## M6 – Abrechnung light + Fortschritt

- Stundensatz und Währung (EUR/VND) pro Schüler, Pakete (z. B. Zehnerkarte), Zähler „verbleibende Stunden“ (verbraucht durch „gehalten“).
- Zahlungen manuell erfassen; Monatsübersicht offen/bezahlt; CSV-Export über das Teilen-Sheet. Beträge nur als Text, ohne Umrechnung und Zahlungsabwicklung.
- Fortschritt pro Schüler: Level-Verlauf, behandelte Topics, Anwesenheits- und Absagequote.
- **Tests:** Berechnung offene Stunden/Beträge, CSV-Format, RLS (Schüler sieht eigenes Guthaben nur lesend).

## M7 – Zweisprachigkeit, Politur, Datenschutz-Komplettierung

- Vietnamesische Übersetzung vollständig (von deiner Freundin gegengelesen), Sprachumschalter, Diakritika-Test auf beiden Plattformen.
- Dark Mode final, Barrierefreiheits-Check (Font-Scaling 200 %, Screenreader-Labels, Kontraste).
- Offline-Lesezugriff (persistierter Query-Cache) auf Termine und Notizen.
- Konto löschen (Schüler selbst / Lehrer für Schüler), Datenexport (JSON + Anhänge), Datenschutzerklärung (`docs/PRIVACY.md` + In-App).
- Optional: Apple/Google Sign-In als Verknüpfung bestehender Konten.

## M8 – Store-Release

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
5. Wiederkehrende Rechnungen als PDF.

## Offene Punkte / Risiken

- **Kalender-Library:** In M3 entscheidet ein Spike. Wenn keine Library Tag, Woche und Monat sauber mit Dark Mode und Font-Scaling kann, wird ein eigener Timeline-View gebaut (+1–2 Tage).
- **Lokale Supabase unter Windows** braucht Docker Desktop mit WSL2. Alternative: SQL-Tests gegen ein separates Supabase-Testprojekt.
- **Push** ist nur auf echten Geräten mit Dev Build testbar, nicht im Simulator/Expo Go (Android).
