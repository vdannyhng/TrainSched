# TrainSched

Termin- und Lernverwaltung für Vietnamesisch-/Deutsch-Nachhilfe. Mobile App (Android + iOS) mit Expo, Backend auf Supabase.

- Architektur: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Roadmap / Meilensteine: [docs/ROADMAP.md](docs/ROADMAP.md)
- Entwicklungsprozess & Security Gates: [docs/SDLC.md](docs/SDLC.md)

**Stand:** M1–M8 fertig: Auth/Rollen/RLS, Schülerverwaltung, Termine (Serien, Kalender, Blocker, Zeitzonen), Notizen, Anhänge, Hausaufgaben, Notiz-Suche, Anfragen (Verschieben/Absagen), Push-Benachrichtigungen, Lernfortschritt, Konto löschen, Datenexport, Datenschutzerklärung, Offline-Lesen sowie Security Gates und CI-Pipeline (siehe [docs/SDLC.md](docs/SDLC.md)).

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
cp supabase/functions/.env.example supabase/functions/.env
```

In `.env.local` den `PUBLISHABLE_KEY` aus der Ausgabe von `npm run db:start` eintragen. Mit `npx supabase status` lässt er sich jederzeit wieder anzeigen.

```bash
npm run db:reset          # Migrationen + Demo-Daten (supabase/seed.sql) einspielen
npm run functions:serve   # Edge Functions lokal (Einladungen + Push-Versand), eigenes Terminal
npm start                 # Expo Dev-Server für Expo Go, QR-Code scannen
```

### Auf dem Handy testen

PC und Handy müssen im selben Netz sein. Im Entwicklungsmodus ersetzt die App eine lokale Supabase-Adresse (`127.0.0.1`, `192.168.…`) automatisch durch die Adresse des Rechners, auf dem `npm start` läuft – ein IP-Wechsel des PCs ist also kein Problem. Cloud-URLs bleiben unverändert.

### Push-Benachrichtigungen

Ablauf: Trigger und Cron schreiben in `notification_outbox` → `pg_net` ruft die Edge Function `send-push` auf → diese schickt die Nachricht über den Expo Push Service an alle Geräte des Empfängers. Lokal sind URL und Secret über `supabase/seed.sql` (Vault) und `supabase/functions/.env` bereits verdrahtet.

Damit ein Handy ein Push-Token bekommt, braucht die App eine **EAS-Projekt-ID** (einmalig, mit Expo-Konto):

```bash
npx eas-cli@latest login
npx eas-cli@latest init      # trägt extra.eas.projectId in app.json ein
```

- **iPhone mit Expo Go:** Danach App neu laden, im Konto unter „Benachrichtigungen“ erlauben.
- **Android:** Expo Go kann seit SDK 53 keine Pushes mehr. Dafür einen Dev Build bauen und mit `npm run start:dev` starten:
  ```bash
  npx eas-cli@latest build --profile development --platform android
  ```
- Für den Store-Release braucht es zusätzlich die APNs-/FCM-Zugangsdaten (Apple Developer, Google Play). EAS fragt beim Build danach.

### Demo-Zugänge (nur lokal)

Die Zugangsdaten und ein offener Einladungscode stehen im Kopf von [supabase/seed.sql](supabase/seed.sql).

- **Lehrerin (Admin):** sieht die Lehrer-Tabs (Heute, Kalender, Schüler, Anfragen, Konto).
- **Schülerin:** sieht beim ersten Login den Datenschutz-Screen, danach die Schüler-Tabs.
- **Einladung:** Auf „Ich habe einen Einladungscode“ tippen, den Code aus `seed.sql` eingeben und ein neues Konto anlegen. Alternativ per Deep Link `trainsched://invite?code=…`.

Mails (z. B. für den Passwort-Reset) landen lokal in Mailpit: <http://127.0.0.1:54324>.

## Skripte

| Befehl                    | Zweck                                                           |
| ------------------------- | --------------------------------------------------------------- |
| `npm start`               | Expo Dev-Server für Expo Go                                     |
| `npm run start:dev`       | Expo Dev-Server für den eigenen Dev Build (`eas build`)         |
| `npm run check`           | TypeScript (`tsc --noEmit`) + ESLint + Prettier-Check           |
| `npm test`                | Jest + React Native Testing Library                             |
| `npm run test:db`         | pgTAP-Tests für RLS und SQL-Funktionen (Supabase muss laufen)   |
| `npm run db:reset`        | DB neu aufsetzen (Migrationen + Seed)                           |
| `npm run db:types`        | TypeScript-Typen aus dem DB-Schema generieren                   |
| `npm run functions:serve` | Edge Functions lokal starten                                    |
| `npm run format`          | Prettier auf alle Dateien                                       |
| `npm run test:abuse`      | Missbrauchstests gegen lokale API (braucht `functions:serve`)   |
| `npm run audit:gate`      | npm audit mit Ausnahmen aus `security-exceptions.json`          |
| `npm run test:secrets`    | Secret-Scan (secretlint)                                        |
| `npm run privacy:md`      | `docs/PRIVACY.md` aus der Datenschutzerklärung der App erzeugen |

## Web-Release (Website + „Zum Home-Bildschirm“)

Live: **https://trainsched.expo.app** (Supabase-Projekt `jlrcdqgiwyneykaijqpm`, EU).

1. `.env.production.local` anlegen (wird nicht committet):
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…
   ```
2. Bauen und veröffentlichen (passiert nach jedem Merge auf `master` automatisch über die CI; manuell nur im Notfall):
   ```bash
   npm run deploy:web
   ```
   `build:web` setzt dabei eine Content-Security-Policy, die nur die eigene Seite und das Supabase-Projekt erlaubt.
3. Auf dem Handy die Adresse in Safari (iPhone) bzw. Chrome (Android) öffnen → Teilen bzw. Menü → **„Zum Home-Bildschirm“**.

Im Browser gibt es keine Push-Benachrichtigungen und keinen Offline-Cache.

Datenbank-Änderungen in die Cloud: `npx supabase db push` (nie mit `--include-seed` – der Seed enthält Testkonten). Auth-Einstellungen: `npx supabase config push --project-ref jlrcdqgiwyneykaijqpm` (Werte für die Cloud stehen unter `[remotes.production]`).

## Supabase in der Cloud (Produktion)

1. Auf supabase.com ein Projekt in einer **EU-Region** anlegen (Frankfurt oder Zürich).
2. Unter Authentication → Sign In / Providers **„Allow new users to sign up“ ausschalten**. Den E-Mail-Provider **aktiv lassen**.
3. Unter Authentication → URL Configuration `trainsched://**` als Redirect-URL eintragen (für den Passwort-Reset).
4. Lokal verknüpfen und deployen:
   ```bash
   npx supabase link --project-ref <ref>
   npx supabase db push
   npx supabase functions deploy accept-invite --no-verify-jwt
   npx supabase functions deploy send-push --no-verify-jwt
   npx supabase functions deploy delete-account
   npx supabase secrets set PUSH_DISPATCH_SECRET=<langes-zufälliges-secret>
   ```
   Im SQL-Editor die Vault-Secrets für den Push-Versand setzen (gleiches Secret):
   ```sql
   select vault.create_secret('https://<ref>.supabase.co/functions/v1/send-push', 'push_dispatch_url');
   select vault.create_secret('<langes-zufälliges-secret>', 'push_dispatch_secret');
   ```
5. Die erste Admin-Person anlegen: Im Dashboard unter Authentication → Users einen User erstellen, dann im SQL-Editor ausführen:
   ```sql
   select private.bootstrap_admin('deine@mail.ch');
   ```
6. In `.env.local` (bzw. als EAS-Umgebungsvariablen) die Projekt-URL und den Publishable Key eintragen.

## Hinweise für die Entwicklung

- **Kein `db:reset`**, wenn lokale Konten erhalten bleiben sollen – neue Migrationen mit `npx supabase migration up` einspielen.
- `supabase migration up` spielt eine Migration **nicht atomar** ein: Bricht sie ab, bleiben Teilobjekte zurück. Dann gezielt aufräumen oder (ohne wichtige lokale Daten) `db:reset`.
- PowerShell blockiert evtl. `npm.ps1` → `npm.cmd …` verwenden.

## Sicherheit

- Rechte werden **serverseitig per Row Level Security** erzwungen. Die Rollen-Weiterleitung in der App ist nur UX.
- Die offene Registrierung ist gesperrt. Konten entstehen ausschliesslich über Einladungscodes (Edge Function `accept-invite`).
- Im Repo stehen keine Secrets. `.env.local` und `supabase/functions/.env` sind per `.gitignore` ausgeschlossen, nur die `.env.example`-Dateien werden committed. Das Secret `local-dev-push-secret` gilt nur lokal.
- Sitzung und Offline-Cache liegen auf dem Handy AES-256-GCM-verschlüsselt, der Schlüssel im iOS-Keychain bzw. Android-Keystore (Web: Browser-Speicher, unverschlüsselt).
- Prozess, Security Gates und Bedrohungsmodell: [docs/SDLC.md](docs/SDLC.md), [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md). Schwachstellen melden: [SECURITY.md](SECURITY.md).
- `send-push` ist nicht für die App gedacht: Die Funktion prüft ein gemeinsames Secret, das nur die Datenbank kennt. Push-Tokens und Outbox sind für Nutzer nicht schreibbar, alle Änderungen laufen über geprüfte RPCs.
