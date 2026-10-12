# TrainSched

Termin- und Lernverwaltung für Vietnamesisch-/Deutsch-Nachhilfe. Mobile App (Android + iOS) mit Expo, Backend auf Supabase.

- Architektur: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Roadmap / Meilensteine: [docs/ROADMAP.md](docs/ROADMAP.md)

**Stand:** M1 (Setup, Auth, Rollen, Einladungen, RLS) und M2 (Schülerverwaltung, Themen, Notizen pro Schüler) sind fertig.

## Voraussetzungen

| Tool           | Version / Hinweis                                                                |
| -------------- | -------------------------------------------------------------------------------- |
| Node.js        | 24 LTS (mindestens 20.19)                                                        |
| Docker Desktop | muss laufen, damit die lokale Supabase startet                                   |
| Expo Go        | App auf dem Handy (iOS/Android), passend zu **SDK 57**                           |
| Supabase CLI   | kommt als devDependency mit (`npx supabase …`), keine globale Installation nötig |

## Setup (lokal)

```bash
npm install
npm run db:start          # startet Supabase lokal in Docker (beim ersten Mal dauert es)
cp .env.example .env.local
```

In `.env.local` den `PUBLISHABLE_KEY` aus der Ausgabe von `npm run db:start` eintragen. Mit `npx supabase status` lässt er sich jederzeit wieder anzeigen.

```bash
npm run db:reset          # Migrationen + Demo-Daten (supabase/seed.sql) einspielen
npm run functions:serve   # Edge Functions lokal (für Einladungen nötig), eigenes Terminal
npm start                 # Expo Dev-Server, QR-Code mit Expo Go scannen
```

### Auf dem Handy testen

Das Handy kann `127.0.0.1` nicht erreichen. Setze in `.env.local` deshalb die **LAN-IP deines PCs** ein, z. B. `EXPO_PUBLIC_SUPABASE_URL=http://192.168.1.23:54321`. Die IP zeigt `ipconfig` unter „IPv4-Adresse“. PC und Handy müssen im selben WLAN sein. Danach `npm start` neu starten.

### Demo-Zugänge (nur lokal)

Die Zugangsdaten und ein offener Einladungscode stehen im Kopf von [supabase/seed.sql](supabase/seed.sql).

- **Lehrerin (Admin):** sieht die Lehrer-Tabs (Heute, Kalender, Schüler, Anfragen, Konto).
- **Schülerin:** sieht beim ersten Login den Datenschutz-Screen, danach die Schüler-Tabs.
- **Einladung:** Auf „Ich habe einen Einladungscode“ tippen, den Code aus `seed.sql` eingeben und ein neues Konto anlegen. Alternativ per Deep Link `trainsched://invite?code=…`.

Mails (z. B. für den Passwort-Reset) landen lokal in Mailpit: <http://127.0.0.1:54324>.

## Skripte

| Befehl                    | Zweck                                                         |
| ------------------------- | ------------------------------------------------------------- |
| `npm start`               | Expo Dev-Server                                               |
| `npm run check`           | TypeScript (`tsc --noEmit`) + ESLint + Prettier-Check         |
| `npm test`                | Jest + React Native Testing Library                           |
| `npm run test:db`         | pgTAP-Tests für RLS und SQL-Funktionen (Supabase muss laufen) |
| `npm run db:reset`        | DB neu aufsetzen (Migrationen + Seed)                         |
| `npm run db:types`        | TypeScript-Typen aus dem DB-Schema generieren                 |
| `npm run functions:serve` | Edge Functions lokal starten                                  |
| `npm run format`          | Prettier auf alle Dateien                                     |

## Supabase in der Cloud (Produktion)

1. Auf supabase.com ein Projekt in einer **EU-Region** anlegen (Frankfurt oder Zürich).
2. Unter Authentication → Sign In / Providers **„Allow new users to sign up“ ausschalten**. Den E-Mail-Provider **aktiv lassen**.
3. Unter Authentication → URL Configuration `trainsched://**` als Redirect-URL eintragen (für den Passwort-Reset).
4. Lokal verknüpfen und deployen:
   ```bash
   npx supabase link --project-ref <ref>
   npx supabase db push
   npx supabase functions deploy accept-invite --no-verify-jwt
   ```
5. Die erste Admin-Person anlegen: Im Dashboard unter Authentication → Users einen User erstellen, dann im SQL-Editor ausführen:
   ```sql
   select private.bootstrap_admin('deine@mail.ch');
   ```
6. In `.env.local` (bzw. als EAS-Umgebungsvariablen) die Projekt-URL und den Publishable Key eintragen.

## Sicherheit

- Rechte werden **serverseitig per Row Level Security** erzwungen. Die Rollen-Weiterleitung in der App ist nur UX.
- Die offene Registrierung ist gesperrt. Konten entstehen ausschliesslich über Einladungscodes (Edge Function `accept-invite`).
- Im Repo stehen keine Secrets. `.env.local` ist per `.gitignore` ausgeschlossen, nur `.env.example` wird committed.
