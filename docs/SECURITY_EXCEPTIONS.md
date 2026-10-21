# Akzeptierte Sicherheitsfunde

Maschinenlesbar in [`security-exceptions.json`](../security-exceptions.json) – das Audit-Gate (`npm run audit:gate`) lässt nur diese High/Critical-Funde durch und schlägt nach dem Ablaufdatum wieder an.

| Advisory            | Paket      | Schwere | Wo                                      | Begründung                                                                                        | Ablauf     |
| ------------------- | ---------- | ------- | --------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------- |
| GHSA-vfj7-8cjw-p6xm | braces     | high    | Metro, Jest (Build/Test)                | Glob-Muster stammen aus der eigenen Konfiguration, nie von Nutzern; nicht im App-Bundle; kein Fix | 2027-01-31 |
| GHSA-86w9-cpqp-85rv | node-forge | high    | `@expo/code-signing-certificates` (CLI) | Nur Expo-CLI-Werkzeug für Update-Signaturen, wird nicht genutzt; nicht im App-Bundle; kein Fix    | 2027-01-31 |

## Moderate Funde (nicht blockierend, beobachtet)

| Advisory            | Paket                | Wo                         | Einschätzung                                                                                          |
| ------------------- | -------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------- |
| GHSA-vcc3-ghjq-m6fr | decode-uri-component | expo-router → query-string | Im App-Bundle. Schlimmstenfalls friert ein manipulierter Deep Link die eigene App ein. Fix mit SDK 58 |
| GHSA-hp3w-g68c-fv3c | sprintf-js           | js-yaml (Build)            | Nur Build-Werkzeug                                                                                    |
| GHSA-w5hq-g745-h8pq | uuid                 | xcode (Config-Plugins)     | Nur beim Prebuild                                                                                     |

Neubewertung: bei jedem Expo-SDK-Update und spätestens zum Ablaufdatum.
