# TrainSched – Threat Model (STRIDE light)

Stand: 2026-10-21 · Pflege: bei jeder neuen Tabelle, RPC, Edge Function oder jedem neuen Datenfluss (siehe `docs/SDLC.md`).

## Systemübersicht und Vertrauensgrenzen

```
Handy/Browser (App, Expo)  ──HTTPS──▶  Supabase (Auth · PostgREST/RLS · Storage · Edge Functions)  ──▶  Expo Push ─▶ APNs/FCM
   │ Sitzung + Offline-Cache                │ Postgres: RLS, RPCs, pg_cron, pg_net, Vault
   │ (verschlüsselt, Schlüssel im Keychain)  │
```

- **Grenze 1 – Gerät ↔ Backend:** Alles aus der App ist nicht vertrauenswürdig. Rechte nur serverseitig (RLS, RPC-Prüfungen).
- **Grenze 2 – Backend ↔ Dritte:** Expo/Apple/Google bekommen nur Push-Token, Titel und Kurztext.
- **Rollen:** anon (nur Publishable Key) · student · teacher · admin · service_role (nur Server).

## Bedrohungen und Gegenmassnahmen

| #   | Bereich               | STRIDE | Bedrohung                                                           | Gegenmassnahme                                                                                                                             | Nachweis (Test)                                               |
| --- | --------------------- | ------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| T1  | Daten (RLS)           | I, T   | Lehrkraft/Schüler liest oder ändert fremde Daten                    | RLS auf jeder Tabelle, `revoke all` + gezielte Grants, Schreiben sensibler Tabellen nur per RPC                                            | `00_security_baseline`, `01`–`14` pgTAP, `npm run test:abuse` |
| T2  | Rechteprüfung         | E      | NULL-Logik hebelt `not (…)`-Prüfungen aus                           | `coalesce(…, false)` in security-definer-Prüfungen; Regel in SDLC                                                                          | `13_progress`, `14_account_privacy` (Schüler ohne Login)      |
| T3  | security definer      | E      | Suchpfad-Hijacking über eigene Funktionen/Tabellen                  | `set search_path = ''`, vollqualifizierte Namen                                                                                            | `00_security_baseline`                                        |
| T4  | Profil                | E      | Schüler setzt sich selbst `role = admin`                            | Spalten-Grants (nur Name, Zeitzone, Sprache, Erinnerungen), Rolle aus `app_metadata`                                                       | `test:abuse` „kann sich nicht zur Admin machen“               |
| T5  | Einladung             | S      | Einladungscode erraten (Brute Force)                                | 8 Zeichen aus 32 (~10¹²), Ablauf 14 Tage, einmalig, gehasht gespeichert; Rate-Limit 10 Versuche / 15 min / Adresse, 300 global             | `02_invitations`, `15_security_hardening`                     |
| T6  | Login                 | S      | Passwort-Raten, Konto-Enumeration                                   | Supabase-Rate-Limit (30 / 5 min / IP), einheitliche Fehlermeldungen, Passwort ≥ 8 mit Buchstaben+Ziffern, Registrierung gesperrt           | `auth/errors-test`, Konfiguration `supabase/config.toml`      |
| T7  | Sitzung auf dem Gerät | I      | Gestohlenes/gerootetes Gerät liest Refresh-Token und Notizen        | AES-256-GCM, Schlüssel im iOS-Keychain/Android-Keystore (`secureStorage.ts`); Cache 7 Tage, beim Abmelden gelöscht                         | `cipher-test`, `lib-test` (Offline-Filter)                    |
| T8  | Web-Version           | I      | Sitzung/Cache im Browser-localStorage unverschlüsselt               | **Akzeptiert** für die Web-Variante (kein sicherer Schlüsselspeicher im Browser); vor Web-Release CSP und kurze Sitzungsdauer prüfen       | offen (Web-Release)                                           |
| T9  | Storage               | I, T   | Fremde Dateien herunterladen/löschen, Pfade raten                   | Privater Bucket, Policies über Metadaten + Ordner `{teacher_id}/`, Signed URLs mit Ablauf, MIME-/Grössenlimit                              | `09_notes_attachments_homework`, `test:abuse` (Datei)         |
| T10 | Edge `send-push`      | S, D   | Fremde lösen Massen-Pushes aus                                      | Nur mit gemeinsamem Secret (Vault ↔ Function-Secret), Vergleich in konstanter Zeit, Daten nur aus Outbox                                   | `test:abuse` (403 ohne/mit falschem Secret)                   |
| T11 | Edge `delete-account` | E      | Fremdes Konto/fremde Schüler löschen                                | JWT-Pflicht, Plan mit Rechten des Nutzers (`account_deletion_plan`), Admin-Selbstlöschung gesperrt                                         | `14_account_privacy`, `test:abuse`, E2E aus M7                |
| T12 | Edge `accept-invite`  | S, D   | Konten ohne Einladung, Massenanfragen                               | Code-Prüfung + atomares Einlösen, Rollback bei Wettlauf, Rate-Limit (T5)                                                                   | `02_invitations`, `15_security_hardening`, `test:abuse`       |
| T13 | Push-Inhalte          | I      | Vertrauliches landet bei Expo/Apple/Google oder auf Sperrbildschirm | Nur Titel, Datum, Name des Termins – keine Notizen; Texte zentral in `pushText.ts`                                                         | `pushText-test`                                               |
| T14 | Export                | I      | Export enthält fremde/zu viele Daten                                | `export_my_data` ist security invoker → RLS filtert; Datei-Links 7 Tage gültig                                                             | `14_account_privacy`, `test:abuse` (Export)                   |
| T15 | Abhängigkeiten        | T      | Verwundbare oder kompromittierte Pakete                             | `npm ci` mit Lockfile, Audit-Gate (High/Critical blockieren), Ausnahmen mit Ablauf, Dependabot                                             | CI-Job „App“ (`audit:gate`)                                   |
| T16 | Secrets im Repo       | I      | Service-Role-Key o. ä. wird committet                               | secretlint (pre-commit + CI), gitleaks über die Historie, `.env*` ignoriert                                                                | CI-Jobs „App“, „Secrets“                                      |
| T17 | Code                  | T, E   | Unsichere Muster (XSS über Links, eval, …)                          | Eigener Markdown-Renderer ohne HTML, Links nur http(s); Online-Raum-Links per DB-Constraint nur http(s); Semgrep in CI                     | `markdown-test`, `15_security_hardening`, CI-Job „SAST“       |
| T18 | Admin                 | E, R   | Missbrauch der Admin-Rolle, fehlende Nachvollziehbarkeit            | Admin nur per `bootstrap_admin` (SQL), Einladungen von Lehrkräften nur durch Admin; Supabase-Logs; **offen:** Audit-Log für Admin-Aktionen | `01_rls_core`, `02_invitations`                               |
| T19 | Verfügbarkeit         | D      | Datenbank überlastet, Backups fehlen                                | Supabase Pro mit täglichen Backups (vor Release), Rate-Limits Auth/Einladung                                                               | Release-Checkliste (G3)                                       |

## Offene Risiken / nächste Schritte

1. **Web-Release (T8):** Content-Security-Policy, kürzere Sitzungsdauer, ggf. kein Offline-Cache im Browser.
2. **Audit-Log (T18):** Admin-Aktionen (Pausieren, Löschen) protokollieren.
3. **Schlüsselrotation:** Ablauf in `docs/INCIDENT.md` beschrieben; einmal pro Jahr üben.
4. **Gerätesicherheit:** Optional App-Sperre (Face ID / PIN) für Lehrkräfte – nach Rückmeldung aus dem Test.
