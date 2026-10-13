# TrainSched – Architektur

Stand: 2026-10-13 · Status: **freigegeben**, M1–M3 umgesetzt

## 1. Getroffene Entscheidungen (aus den Rückfragen)

| Thema             | Entscheidung                                                                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gruppenunterricht | Ab Tag 1 im Datenmodell: Jeder Termin hat Teilnehmer (`lesson_participants`). Ein Einzeltermin ist eine Gruppe mit einer Person.                              |
| Minderjährige     | Kein Eltern-Login. Kontaktdaten der Erziehungsberechtigten liegen im Schülerprofil, die Einwilligung wird beim Einladen dokumentiert (`guardian_consent_at`). |
| Mehrere Lehrer    | Daten sind pro Lehrer getrennt (`teacher_id` auf allen Fachtabellen). Die Rolle `admin` (deine Freundin) sieht alles.                                         |
| Sprache / Währung | UI auf Deutsch und Vietnamesisch über i18n-Keys ab M1. Die Währung wird pro Schüler gewählt (`EUR` oder `VND`), nur angezeigt, ohne Umrechnung.               |

## 2. Tech-Stack

| Bereich          | Wahl                                                                                                                 | Begründung / Abweichung                                                                         |
| ---------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| App              | Expo SDK 57, React Native, TypeScript `strict`, Expo Router                                                          | wie vorgeschlagen                                                                               |
| Backend          | Supabase: Auth, Postgres, RLS, Storage, Edge Functions, `pg_cron`                                                    | wie vorgeschlagen; Projekt in EU-Region (Frankfurt `eu-central-1` oder Zürich, falls verfügbar) |
| Daten-Layer      | TanStack Query (+ `persistQueryClient` für Offline-Lesen), supabase-js                                               | wie vorgeschlagen                                                                               |
| Formulare        | React Hook Form + Zod; dieselben Zod-Schemas für Formular und API-Grenze                                             | wie vorgeschlagen                                                                               |
| Datum/Zeit       | **Luxon** in der App (IANA-Zeitzonen, DST-sicher); **Serien-Expansion in Postgres**                                  | Abweichung: kein `rrule`-String bzw. keine rrule.js-Library, Begründung siehe §5                |
| Kalender-UI      | `@howljs/calendar-kit` (Tag/Woche, Timeline) + `react-native-calendars` (Monat)                                      | wird in M3 per Spike geprüft, Fallback ist ein eigener Timeline-View                            |
| Listen           | `@shopify/flash-list`                                                                                                | Virtualisierung                                                                                 |
| Medien           | `expo-image-picker` (Kamera/Galerie), `expo-image-manipulator` (Komprimierung), `expo-document-picker`, `expo-audio` |                                                                                                 |
| Push             | `expo-notifications` + Expo Push Service, Versand aus Edge Functions                                                 | Remote-Push auf Android läuft nicht in Expo Go, ab M5 braucht es einen **Dev Build**            |
| Kalender-Export  | ICS-Datei (Teilen-Sheet) in M3; ICS-Abo-Feed per Edge Function später                                                |                                                                                                 |
| i18n             | `i18next` + `react-i18next` + `expo-localization`                                                                    |                                                                                                 |
| Schrift          | **Be Vietnam Pro** (`@expo-google-fonts`): vollständige vietnamesische Diakritika, gut lesbar                        | wird mit Teststrings geprüft („Nguyễn Thị Hương“, „Ừ, được rồi“)                                |
| Session-Speicher | `expo-sqlite/localStorage` (Empfehlung der Expo-Doku für Supabase)                                                   | SecureStore ist auf ca. 2 KB begrenzt und für JWT-Sessions zu klein                             |
| Tests            | Jest + React Native Testing Library; **pgTAP** über `supabase test db` für RLS und SQL-Funktionen                    |                                                                                                 |
| Qualität         | ESLint (expo config) + Prettier, `tsc --noEmit` in `npm run check`                                                   |                                                                                                 |
| Builds           | EAS Build + EAS Submit, Profile `development` / `preview` / `production`                                             |                                                                                                 |

**Voraussetzungen auf deinem Rechner:** Node 24 LTS (installiert). Ausserdem Docker Desktop (für die lokale Supabase und die SQL-Tests), Supabase CLI und ein Expo-Konto. Für die Stores: Apple Developer Program (99 USD/Jahr) und Google Play Console (25 USD einmalig). Einen Mac braucht es dank EAS nicht.

## 3. Rollen & Rechte

Rollen in `profiles.role`: `admin` | `teacher` | `student`. Admin ist zugleich Lehrer.

| Aktion                                                 | admin                                       | teacher                       | student                                        |
| ------------------------------------------------------ | ------------------------------------------- | ----------------------------- | ---------------------------------------------- |
| Schüler anlegen/bearbeiten/archivieren                 | alle                                        | eigene                        | –                                              |
| Eigenes Profil (Name, Zeitzone, Sprache, Erinnerungen) | ✓                                           | ✓                             | ✓                                              |
| Termine lesen                                          | alle                                        | eigene                        | nur solche, an denen er teilnimmt              |
| Termine anlegen/ändern/verschieben/absagen             | alle                                        | eigene                        | – (nur Anfrage)                                |
| Teilnehmerliste eines Gruppentermins                   | ✓                                           | ✓                             | nur eigener Eintrag; sonst nur Anzahl über RPC |
| Notizen `visibility = student`                         | ✓                                           | eigene                        | eigene Schüler- und Terminnotizen (lesen)      |
| Notizen `visibility = teacher`                         | ✓                                           | eigene                        | **nie**                                        |
| Anhänge                                                | wie die Notiz bzw. Sichtbarkeit des Anhangs |                               |                                                |
| Hausaufgaben                                           | ✓                                           | eigene                        | eigene lesen; nur `status` ändern (RPC)        |
| Verschiebe-/Absageanfragen                             | ✓                                           | an ihn gerichtete entscheiden | eigene erstellen/zurückziehen                  |
| Einladungen erzeugen                                   | ✓ (auch Lehrer-Einladungen)                 | Schüler-Einladungen           | –                                              |
| Konto + Daten löschen                                  | ✓                                           | eigene Schüler                | eigenes Konto                                  |

**Durchsetzung:**

- RLS ist auf **jeder** Tabelle aktiv, standardmässig gilt deny. Die Policies nutzen Helper-Funktionen (`security definer`, `stable`, `set search_path = ''`):
  `auth_role()`, `is_admin()`, `owns_teacher_row(teacher_id)`, `my_student_ids()`, `is_lesson_participant(lesson_id)`.
- **RLS wirkt auf Zeilen, nicht auf Spalten.** Felder, die nur der Lehrer sehen darf, liegen deshalb nie in einer Tabelle, die Schüler lesen dürfen. Die „Lehrernotizen“ zum Schüler sind darum Einträge in `notes` mit `visibility = 'teacher'` und keine Spalte in `students`.
- Schüler bekommen kein `UPDATE` auf `lessons` oder `homework`. Erlaubte Änderungen laufen über eng gefasste RPCs (`set_homework_status`, `create_change_request`), die serverseitig prüfen.
- Storage: privater Bucket `attachments`, Pfad `{teacher_id}/{attachment_id}`. Die Storage-Policies prüfen gegen die Tabelle `attachments`, Zugriff gibt es nur über Signed URLs.
- Jede Policy wird mit pgTAP getestet, und zwar positiv und negativ: Schüler A sieht B nicht, Lehrer X sieht Y nicht, Schüler sieht keine Lehrernotiz.

### Registrierung nur per Einladung

1. Im Supabase-Dashboard ist **„Allow new users to sign up“ ausgeschaltet**, eine offene Registrierung ist damit technisch unmöglich. Der E-Mail-Provider selbst bleibt aktiv (sonst ist auch der Login gesperrt).
2. Der Lehrer erzeugt im Schülerprofil eine Einladung: einen 8-stelligen Code und einen Deep Link `trainsched://invite?code=CODE`, 14 Tage gültig. In der DB liegt nur der Hash des Codes.
3. Der Schüler öffnet den Link oder gibt den Code ein und legt E-Mail und Passwort fest. Die Edge Function `accept-invite` prüft den Code und legt den User per Admin-API an (Service Role, nur serverseitig). Danach verknüpft sie `students.profile_id` und markiert die Einladung als eingelöst.
4. Apple/Google Sign-In kommt **optional in M7** als nachträgliches Verknüpfen (`linkIdentity`) für bestehende Konten. So bleibt die Registrierung geschlossen. Hinweis: Sobald Google-Login auf iOS angeboten wird, verlangt Apple auch „Sign in with Apple“.
5. Passwort-Reset läuft über die Supabase-Reset-Mail und einen Deep Link in die App.

## 4. Datenmodell

Konventionen: `id uuid default gen_random_uuid()`, alle Zeitpunkte als `timestamptz` (UTC), `created_at`/`updated_at` per Trigger. Fachtabellen haben `teacher_id` für die Mandantentrennung.

### Kern (M1–M3)

```
profiles            id (=auth.users.id) · role · display_name · email · timezone (IANA) · locale (de|vi)
                    · reminder_offsets_min int[] default {1440,60} · created_at

teacher_settings    teacher_id (PK) · buffer_minutes default 15 · default_duration_min default 60
                    · cancel_deadline_hours default 24 · default_timezone default 'Europe/Zurich'

invitations         id · teacher_id · student_id? · role (student|teacher) · code_hash · expires_at
                    · redeemed_at? · redeemed_by?

students            id · teacher_id · profile_id? (null bis Einladung eingelöst)
                    · first_name · last_name · email? · phone? · timezone · locale
                    · start_level (A1..B2) · current_level · goal
                    · status (active|inactive|archived)
                    · is_minor · guardian_name? · guardian_email? · guardian_phone? · guardian_consent_at?
                    · hourly_rate? numeric · currency (EUR|VND)          ← Abrechnung, M6
                    · search_text GENERATED (klein, ohne Diakritika: „Huong“ findet „Hương“)

tags                id · teacher_id · label · color (#RRGGBB)   ← nur Themen; 5 Standard-Themen pro Lehrer
                    (Level A1–B2 ist bewusst KEIN Tag, sondern Enum mit fester Farbe – eine Quelle der Wahrheit)
student_tags        student_id · tag_id

lesson_series       id · teacher_id · title? · frequency (weekly|biweekly) · weekday
                    · local_start_time (time) · duration_min · timezone (IANA)
                    · start_date · end_date? · format (online|in_person) · location? · meeting_url?
                    · materialized_until (date)
series_participants series_id · student_id
series_tags         series_id · tag_id

lessons             id · teacher_id · series_id? · original_start_at? (Slot-Identität in der Serie)
                    · start_at · end_at · timezone (Wanduhr-Zeitzone des Termins)
                    · status (scheduled|held|cancelled) · cancel_reason? · cancelled_by? · cancelled_at?
                    · is_exception bool (in der Serie einzeln geändert → Regeneration lässt ihn in Ruhe)
                    · format · location? · meeting_url? · title?
                    EXCLUDE USING gist (teacher_id WITH =, tstzrange(start_at,end_at) WITH &&)
                        WHERE (status <> 'cancelled')                ← harte Doppelbuchungs-Sperre
lesson_participants lesson_id · student_id · attendance (pending|present|excused|absent)
lesson_tags         lesson_id · tag_id
```

### Notizen, Anhänge, Hausaufgaben (M4; `notes` pro Schüler existiert seit M2)

```
notes               id · teacher_id · author_id · lesson_id? · student_id? (mind. eins gesetzt)
                    · body (Markdown-light) · visibility (student|teacher)
                    · search tsvector GENERATED (simple config + unaccent → findet „Huong“ in „Hương“)
attachments         id · teacher_id · note_id? · lesson_id? · student_id? · visibility
                    · storage_path · mime_type · size_bytes · original_name · uploaded_by
homework            id · teacher_id · lesson_id? · student_id · title · description?
                    · due_at? · status (open|done) · done_at?
```

### Benachrichtigungen & Anfragen (M5)

```
push_tokens         id · profile_id · expo_token (unique) · platform · last_seen_at
notification_log    id · profile_id · lesson_id? · kind · offset_min? · sent_at   ← Dedupe der Erinnerungen
change_requests     id · teacher_id · lesson_id · student_id · type (reschedule|cancel)
                    · reason? · proposed_slots tstzrange[] · is_late (Absagefrist unterschritten)
                    · status (pending|accepted|declined|withdrawn) · decided_by? · decided_at? · response?
```

### Später (M6+)

```
availability_slots  teacher_id · weekday · local_start · local_end · timezone · valid_from/to
packages            id · teacher_id · student_id · name · hours_total · price · currency · purchased_at
payments            id · teacher_id · student_id · package_id? · amount · currency · paid_at · note
level_history       student_id · level · changed_at
library_items       id · teacher_id · kind (worksheet|vocab) · title · level · topic tags · storage_path?/content
library_assignments library_item_id · student_id · assigned_at
```

Beträge: `numeric(12,2)`, die Währung steht pro Zeile. Angezeigt wird nur Text über `Intl.NumberFormat` (`45,00 EUR`, `500.000 ₫`), ohne Umrechnung.

## 5. Terminlogik (der heikle Teil)

**Speicherung:** `start_at`/`end_at` sind UTC (`timestamptz`). Zusätzlich speichert jeder Termin seine **Wanduhr-Zeitzone** (meist `Europe/Zurich`). Nur so bleibt „jeden Dienstag 18:00 in Zürich“ über die Sommerzeitumstellung hinweg 18:00.

**Anzeige:** Termine erscheinen in der Zeitzone des Betrachters (`profiles.timezone`, Vorschlag aus dem Gerät). Weicht die Zeitzone des Schülers von der des Lehrers ab, zeigt die Termindetailseite beide Zeiten: „18:00 Zürich · 23:00 Hà Nội“.

**Serien, warum kein RRULE-String:**

- Gebraucht werden nur wöchentlich und zweiwöchentlich. rrule.js hat bekannte Probleme mit Zeitzonen und DST.
- Postgres rechnet `(date + local_time) AT TIME ZONE 'Europe/Zurich'` korrekt und DST-sicher. Die Expansion läuft daher als SQL-Funktion `materialize_series(series_id, until)`. Die Regel existiert also nur an einer Stelle, auf dem Server, und ist mit pgTAP testbar.
- Serien werden **materialisiert**: Jedes Vorkommen ist eine echte Zeile in `lessons`, angelegt für ca. 6 Monate im Voraus. Ein `pg_cron`-Job verlängert den Horizont wöchentlich. Vorteile: Notizen, Hausaufgaben, Anwesenheit und Anfragen hängen an echten Terminen, und RLS und Suche bleiben einfach.
- **Ausnahmen:**
  - „Nur diesen Termin ändern“: Die Zeile wird bearbeitet und `is_exception = true` gesetzt.
  - „Diesen und alle folgenden“: Die alte Serie endet (`end_date`), es entsteht eine neue Serie, und künftige, nicht geänderte Termine werden neu erzeugt.
  - Abgesagte Termine bleiben mit `status = cancelled` erhalten, für die Historie und die Absagequote.

**Konfliktprüfung (zweistufig):**

1. **Hart:** Ein Exclusion-Constraint in Postgres verhindert überlappende nicht-abgesagte Termine desselben Lehrers. Das hält auch, wenn die UI einen Fehler hat.
2. **Weich:** Die RPC `check_conflicts(teacher_id, ranges[])` meldet Überschneidungen _und_ Unterschreitungen der Pufferzeit (`teacher_settings.buffer_minutes`). Die UI zeigt das als Warnung mit „Trotzdem speichern“, nur für den Puffer. Bei Serien läuft die Prüfung über alle Vorkommen und zeigt vor dem Speichern eine Konfliktliste.

**Tests:** DST-Wechsel (letzter Sonntag im März/Oktober), Serie über den Jahreswechsel, zweiwöchentlich mit Ausnahme, Serie teilen, Konflikt mit und ohne Puffer, Anzeige Zürich → Berlin → Hanoi (Hanoi kennt keine Sommerzeit, der Abstand springt zwischen 5 und 6 Stunden).

## 6. Benachrichtigungen

- **Erinnerungen:** Ein `pg_cron`-Job ruft alle 5 Minuten die Edge Function `send-reminders` auf. Sie sucht Termine, deren Startzeit minus Offset (pro Nutzer, z. B. 24 h und 1 h) ins aktuelle Fenster fällt, und sendet über die Expo Push API. `notification_log` verhindert Doppelversand.
- **Ereignisse** (verschoben, abgesagt, neue Anfrage, Anfrage entschieden): Datenbank-Trigger schreiben in eine `outbox`, die Edge Function `dispatch-notifications` versendet. Dadurch blockiert keine App-Aktion auf den Push-Versand.
- Inhalte der Pushes sind datensparsam: „Termin morgen 18:00 verschoben“, ohne Notizinhalte.

## 5b. Wem gehört ein Termin?

- Ein Termin gehört genau **einem** Lehrer (`lessons.teacher_id`); alle Teilnehmenden müssen Schüler dieses Lehrers sein (`private.assert_participants_of`, Fehler `participants_other_teacher`).
- Lehrkräfte planen für eigene Schüler. Die **Admin-Person** kann auch für Schüler anderer Lehrer planen – der Termin wird dann automatisch diesem Lehrer zugeordnet (seine Blocker/Pufferzeit gelten). Die Teilnehmerauswahl beschränkt sich nach dem ersten Schüler auf dessen Lehrer.
- Schüler können keine Termine anlegen (RLS, getestet in `07_lesson_permissions.test.sql`).

## 6a. Blocker – private Zeiten der Lehrkraft (seit M3)

- Tabelle `blockers`: Titel, Startdatum, optionales Ende, Wochentage (ISO 1–7), lokale Von/Bis-Zeit, Zeitzone. Einmalig = Start = Ende.
- Nicht materialisiert: `blocker_occurrences(teacher, from, to)` berechnet die Vorkommen pro Zeitraum (DST-sicher, Wanduhrzeit).
- Nur Lehrkräfte sehen Blocker (RLS); `check_conflicts` meldet Überschneidungen als Warnung `blocker` (kein hartes Verbot).
- Kalender: graue, gestrichelte Flächen hinter den Terminen; Startscreen listet sie chronologisch mit.

## 6b. Konten pausieren (seit M3)

- `profiles.access_paused_at`: Ein pausiertes Konto kann sich anmelden, sieht aber nur den Hinweis „Zugang pausiert“.
- Durchgesetzt in RLS: `private.is_active_user()` steckt in allen zentralen Helfern (`is_admin`, `is_teacher`, `my_student_ids`, `is_lesson_participant`, …) – pausierte Nutzer sehen keine Fachdaten.
- RPC `set_access_paused`: Lehrer pausieren eigene Schüler, Admin alle außer sich selbst. Daten bleiben vollständig erhalten.

## 7. Datenschutz (DSGVO / nDSG)

- Supabase-Projekt in EU/CH-Region; Auftragsverarbeitungsvertrag (DPA) mit Supabase abschliessen.
- Datensparsamkeit: Pflichtfelder sind nur Vorname und Zeitzone. Geburtsdatum wird nicht gespeichert, nur das Flag `is_minor`.
- Vor der ersten Nutzung gibt es einen Screen mit Einwilligung und Datenschutzerklärung (Version und Zeitpunkt werden gespeichert). Bei Minderjährigen dokumentiert der Lehrer beim Einladen die Einwilligung der Erziehungsberechtigten.
- **Löschen:** Edge Function `delete-account`. Ein Schüler löscht sein Konto in der App, wie Apple es verlangt. Der Lehrer kann einen Schüler mit allen Notizen, Anhängen und Hausaufgaben löschen (Cascade + Storage-Cleanup).
- **Export:** Edge Function `export-data` liefert JSON + Anhänge als ZIP (M7).
- Keine Secrets im Repo: In `.env` stehen nur `EXPO_PUBLIC_SUPABASE_URL` und `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (öffentlich by design, der Schutz kommt von RLS). Der Service-Role-Key existiert nur als Supabase-Function-Secret. `.env.example` wird committed.

**Hinweis Datumsformatierung:** Wochentags-/Monatsnamen nie über Luxon-`toFormat('ccc'|'LLL')` bilden – das nutzt `Intl.formatToParts`, das auf iOS (Hermes) `null` liefert. Stattdessen `toLocaleString({ weekday: 'short' … })`. Ein Test erzwingt das.

## 8. Ordnerstruktur

```
TrainSched/
├─ src/
│  ├─ app/                       # Expo Router (nur Routing + Screen-Komposition)
│  │  ├─ _layout.tsx             # Provider (Query, Auth, Theme, Fonts) + Stack.Protected-Guards je Rolle
│  │  ├─ index.tsx               # Einstieg: leitet je nach Login/Rolle weiter
│  │  ├─ (auth)/                 # sign-in · invite (?code=) · forgot-password
│  │  ├─ consent.tsx · reset-password.tsx
│  │  ├─ (teacher)/(tabs)/       # today · calendar · students · requests · settings
│  │  │  (später: lesson/[id] · student/[id] im (teacher)-Stack)
│  │  ├─ (teacher)/lesson/       # new · [id] · [id]/edit|reschedule|cancel|held
│  │  ├─ paused.tsx              # Hinweis für pausierte Konten
│  │  └─ (student)/(tabs)/       # lessons · homework · materials · profile; Detail unter /my-lesson/[id]
│  ├─ features/                  # nach Fachdomäne
│  │  ├─ auth/ account/ (später students/ lessons/ tags/ notes/ homework/ requests/ billing/)
│  │  │   └─ (api.ts · schemas.ts · components/ · __tests__/)
│  ├─ components/ui/             # AppText, Button, TextField, FormTextField, Screen, Empty/Error/LoadingState …
│  ├─ components/navigation/     # Tab-Optionen
│  ├─ lib/                       # env.ts · supabase.ts · queryClient.ts · validation.ts (später time.ts · money.ts)
│  ├─ i18n/                      # index.ts · locales/de.json · locales/vi.json
│  ├─ theme/                     # Tokens (Farben hell/dunkel, Abstände, Typo), useTheme
│  └─ types/database.ts          # generiert: npm run db:types
├─ supabase/
│  ├─ config.toml
│  ├─ migrations/                # SQL-Migrationen (Schema, RLS, Funktionen)
│  ├─ functions/                 # accept-invite (später send-reminders · dispatch-notifications · delete-account · export-data)
│  │  └─ _shared/                # Code, den App UND Edge Functions nutzen (z. B. inviteSchema.ts)
│  ├─ tests/database/            # pgTAP-Tests
│  └─ seed.sql                   # lokale Demo-Daten
├─ assets/ · docs/ · README.md
├─ app.json · .env.example · eslint.config.js · .prettierrc.json · tsconfig.json (strict, Alias @/ → src/)
└─ jest.setup.ts (Jest-Config in package.json)
```

Regel: Screens in `src/app/` sind dünn. Datenzugriff läuft über `features/*/api.ts` + TanStack Query, nie direkt aus Komponenten auf `supabase`.

## 9. UX-Leitlinien

- **Lehrer-Startscreen „Heute / Diese Woche“:** Jede Terminkarte bietet per Swipe oder Kontextmenü „Verschieben“, „Notiz“ und „Gehalten“. Verschieben geht in 3 Taps (Karte → Verschieben → Slot wählen → Speichern; der Vorschlag „gleiche Zeit nächste Woche“ ist vorausgewählt). Für eine Notiz reichen 2 Taps bis zum Eingabefeld.
- Touch-Ziele mindestens 48×48 dp, Dynamic Type bzw. Font-Scaling ist erlaubt (kein `allowFontScaling={false}`), Kontrast nach WCAG AA in hell und dunkel.
- Jede Liste hat einen Lade-, Leer- und Fehlerzustand (mit „Erneut versuchen“).
- Farbige Chips für Level und Themen, die Farben sind auf Kontrast geprüft (Test: alle Preset-Farben ≥ 4.5:1). Der Text auf dem Chip wird automatisch schwarz oder weiss gesetzt.
