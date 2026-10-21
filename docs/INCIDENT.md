# TrainSched – Ablauf bei Sicherheitsvorfällen

Für eine Person ausgelegt. Ziel: schnell eindämmen, sauber dokumentieren, Betroffene korrekt informieren.

## 1. Eindämmen (sofort)

| Lage                                     | Massnahme                                                                                                |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Konto missbraucht / Gerät verloren       | Konto in der App pausieren (Konto → Lehrkräfte bzw. Schüler → Zugang pausieren) oder in Supabase sperren |
| Service-Role- oder Secret-Key geleakt    | Schlüssel rotieren (siehe unten), betroffene Edge Functions neu deployen                                 |
| Push-Dispatch-Secret geleakt             | Neues Secret in Vault **und** als Function-Secret setzen                                                 |
| Fehler in RLS/RPC gibt Daten frei        | Betroffene Funktion/Policy per Hotfix-Migration sperren (`revoke`), danach sauber beheben                |
| Verwundbare Abhängigkeit wird ausgenutzt | Update/Override einspielen, EAS Update (JS) bzw. neuer Build                                             |

## 2. Klären

- Was ist passiert, seit wann, welche Daten und Personen sind betroffen? Supabase-Logs (API, Auth, Edge Functions) sichern.
- Alles mit Uhrzeit in einer Notiz festhalten (wird für Meldungen gebraucht).

## 3. Melden

- **Betroffene** informieren, wenn ein Risiko für sie besteht – verständlich, was passiert ist und was sie tun sollten.
- **EDÖB (Schweiz):** Meldung „so rasch als möglich“, wenn die Verletzung voraussichtlich zu einem hohen Risiko führt (revDSG Art. 24).
- **EU-Betroffene (DSGVO Art. 33):** Meldung an die zuständige Aufsichtsbehörde innerhalb von 72 Stunden, sofern ein Risiko besteht.
- Bei Minderjährigen zusätzlich die Erziehungsberechtigten informieren.

## 4. Beheben und lernen

- Ursache beheben, **Test ergänzen**, der den Fehler künftig findet (pgTAP oder `scripts/abuse-tests.mjs`).
- `docs/THREAT_MODEL.md` aktualisieren.

## Schlüsselrotation

| Schlüssel                        | Wo rotieren                                                                             | Danach                                                  |
| -------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Supabase Secret/Service-Role-Key | Dashboard → Project Settings → API Keys (neuen Secret Key erzeugen, alten deaktivieren) | Edge Functions bekommen ihn automatisch; nichts im Repo |
| Publishable Key                  | Dashboard → API Keys                                                                    | Neuer App-Build bzw. EAS-Umgebungsvariable              |
| Push-Dispatch-Secret             | `npx supabase secrets set PUSH_DISPATCH_SECRET=…` und `vault.update_secret(…)`          | Testpush auslösen                                       |
| APNs-/FCM-Schlüssel              | Apple Developer / Firebase, dann `eas credentials`                                      | Neuer Build                                             |

Rotation einmal pro Jahr üben (Release-Checkliste).
