# Projekt: TrainSched – Termin- und Lernverwaltung für Vietnamesisch-/Deutsch-Nachhilfe

## Kontext

Meine Freundin gibt Nachhilfe Vietnamesisch ↔ Deutsch (A1–B2) und hat viele Schüler. Sie braucht eine mobile App (Android + iOS), die ihren stressigen Alltag vereinfacht: Termine planen, verschieben, Lerninhalte festhalten. Schüler sehen nur ihre eigenen Daten.

## Vorgehen (bitte zuerst)

1. Lies diese Anforderungen vollständig. Stelle mir maximal 5 Rückfragen, falls etwas kritisch unklar ist.
2. Erstelle `docs/ARCHITECTURE.md` (Stack, Datenmodell, Rollen/Rechte, Ordnerstruktur) und `docs/ROADMAP.md` (Meilensteine) und warte auf mein OK.
3. Setze danach Meilenstein für Meilenstein um. Nach jedem Meilenstein: lauffähig, getestet, kurzer Commit mit klarer Message.

## Tech-Stack (Vorschlag, begründe Abweichungen)

- Expo (aktuelles SDK) + React Native + TypeScript (strict), Expo Router
- Backend: Supabase (Auth, Postgres, Row Level Security, Storage, Edge Functions). Keine eigene Server-Wartung.
- State/Data: TanStack Query, Zod für Validierung, React Hook Form
- Push: expo-notifications; Kalender-Export: ICS / expo-calendar
- Tests: Jest + React Native Testing Library; RLS-Policies mit SQL-Tests prüfen
- Builds über EAS (Android + iOS), Umgebungsvariablen in `.env`, keine Secrets im Repo

## Rollen & Rechte

- **Admin/Lehrer** (meine Freundin, später weitere Lehrer möglich): sieht alle Schüler, Termine und Notizen, kann alles anlegen, bearbeiten, verschieben, absagen.
- **Schüler**: sieht ausschliesslich eigene Termine, eigene Notizen/Materialien, Hausaufgaben. Darf Termine nicht frei ändern, aber Verschiebe-/Absage-Anfragen stellen.
- Rechte zwingend serverseitig über RLS durchsetzen, nicht nur in der UI.
- Registrierung nur per Einladungslink/-code vom Lehrer (keine offene Registrierung). Login: E-Mail + Passwort, optional Apple/Google Sign-In, Passwort-Reset.

## Kernfunktionen (MVP)

1. **Schülerverwaltung**: Profil (Name, Kontakt, Zeitzone, Sprache, Startlevel, Ziel, Notizen nur für Lehrer), aktiv/inaktiv/archiviert.
2. **Terminverwaltung**:
   - Kalenderansicht (Tag/Woche/Monat) + Listenansicht „Heute / Diese Woche“ als Startscreen für Lehrer.
   - Einzel- und Serientermine (wöchentlich/zweiwöchentlich, Ausnahmen pro Termin).
   - Termin bearbeiten, verschieben, absagen (mit Grund), als „gehalten“ markieren.
   - Konfliktprüfung (Doppelbuchungen, Überschneidungen), Pufferzeit zwischen Terminen einstellbar.
   - Dauer, Ort/Format (Online mit Link, vor Ort), Einzel- oder Gruppenunterricht.
   - Zeitzonen sauber behandeln (Speicherung UTC, Anzeige in Zeitzone des Nutzers; Lehrerin in Europe/Zurich, Schüler evtl. in Deutschland oder Vietnam; Sommerzeit-sicher).
3. **Flags/Tags**: Level (A1, A2, B1, B2) und Topic (frei erweiterbar, z. B. Aussprache, Grammatik, Alltag, Prüfungsvorbereitung, Business) als farbige Chips, filterbar in Kalender und Listen.
4. **Notizen & Ablage**:
   - Pro Termin und pro Schüler Notizen (Markdown-light), getrennt in „für Schüler sichtbar“ und „nur Lehrer“.
   - Anhänge (PDF, Bilder, Audio) über Supabase Storage; Fotos von Tafel/Heft direkt aus der Kamera.
   - Volltextsuche über Notizen, Filter nach Schüler/Level/Topic/Datum.
5. **Hausaufgaben**: pro Termin zuweisbar, Fälligkeit, Status (offen/erledigt), Schüler kann abhaken.
6. **Benachrichtigungen**: Push-Erinnerung vor Terminen (konfigurierbar, z. B. 24 h/1 h), Info bei Verschiebung/Absage, Benachrichtigung der Lehrerin bei Schüleranfragen.

## Sinnvolle Ergänzungen (nach MVP, in Roadmap priorisieren)

- **Verschiebe-/Absageanfragen** durch Schüler mit Vorschlag von Alternativ-Slots; Lehrerin bestätigt oder lehnt ab. Optionale Absagefrist (z. B. 24 h) mit Hinweis.
- **Verfügbarkeiten** der Lehrerin (freie Slots), aus denen Schüler Termine anfragen können.
- **Abrechnung light**: Stundensatz pro Schüler, Zehnerkarten/Pakete, Zähler „verbleibende Stunden“, Übersicht offene/bezahlte Stunden pro Monat, CSV-Export. Keine Zahlungsabwicklung im MVP.
- **Fortschritt pro Schüler**: Level-Verlauf, behandelte Themen, Anwesenheit/Absagen-Quote.
- **Vokabel-/Material-Bibliothek**: wiederverwendbare Arbeitsblätter und Vokabellisten nach Level/Topic, einem Schüler zuweisbar.
- **Wiederholungs-Stundenplan**: „Letzte Stunde in 1 Minute“ – beim Öffnen eines Termins zeigt die App Notizen und Hausaufgaben der vorherigen Stunde.
- **Kalender-Sync** (ICS-Feed / Export nach Google/Apple Kalender).
- **Zweisprachige UI** (Deutsch/Vietnamesisch) via i18n, korrekte Darstellung vietnamesischer Diakritika (Fonts testen!).
- Dark Mode, Offline-Lesezugriff auf Termine/Notizen, Backup/Export aller Daten.

## Nicht-funktionale Anforderungen

- **Datenschutz**: Personenbezogene Daten (teils Minderjährige) → DSGVO/nDSG beachten: Datensparsamkeit, Löschfunktion (Konto + Daten), Einwilligung/Datenschutzerklärung-Screen, EU-Region für Supabase.
- **UX**: Lehrerin muss die häufigsten Aktionen (Termin verschieben, Notiz schreiben) mit ≤3 Taps schaffen. Grosse Touch-Ziele, klare Lade-/Fehler-/Leerzustände.
- **Qualität**: ESLint + Prettier, TypeScript strict, sinnvolle Tests für Terminlogik (Serien, Zeitzonen, Konflikte) und RLS.
- **Performance**: Listen virtualisiert, Pagination, Bilder komprimieren vor Upload.
- **Barrierefreiheit**: Schriftgrössen skalierbar, ausreichender Kontrast.

## Datenmodell (Startpunkt, bitte verfeinern)

`profiles` (id, role, name, timezone, locale) · `students` (profile_id, level, goal, teacher_notes, status) · `lessons` (id, student_id/Gruppe, teacher_id, start_at, end_at, status, location/link, series_id) · `lesson_series` (rrule, Ausnahmen) · `tags` (id, type: level|topic, label, color) · `lesson_tags` · `notes` (lesson_id/student_id, body, visibility) · `attachments` · `homework` · `change_requests` · `packages`/`payments` (später)

## Definition of Done pro Meilenstein

Läuft auf Android + iOS (Expo Go oder Dev Build), keine TypeScript-/Lint-Fehler, Tests grün, README mit Setup-Schritten aktualisiert.

## Meilensteine (Vorschlag)

1. Projekt-Setup, Supabase-Anbindung, Auth + Rollen + Einladungen, RLS
2. Schülerverwaltung + Tags
3. Termine (Einzel/Serie, Kalender, Verschieben/Absagen, Konfliktprüfung)
4. Notizen, Anhänge, Hausaufgaben
5. Push-Benachrichtigungen + Anfragen-Workflow
6. Abrechnung light, Fortschritt, i18n, Politur, EAS-Builds / Store-Vorbereitung
