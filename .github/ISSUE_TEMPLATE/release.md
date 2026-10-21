---
name: Release (Gate G3)
about: Checkliste vor einem Store- oder Web-Release
title: 'Release vX.Y.Z'
labels: release
---

## Gate G3 – Release-Checkliste

- [ ] CI auf dem Release-Commit grün (G2)
- [ ] `docs/THREAT_MODEL.md` aktuell, offene Risiken bewertet
- [ ] Datenschutzerklärung aktuell, Platzhalter ersetzt, Version ggf. erhöht
- [ ] Migrationen geprüft (rückwärtskompatibel, vor dem App-Release eingespielt)
- [ ] Supabase **Security Advisor** und **Performance Advisor** ohne Warnungen
- [ ] Supabase Auth: Registrierung aus, Rate-Limits gesetzt, „Secure password change“ an
- [ ] Secrets nur in Supabase (Edge Function Secrets, Vault) und EAS – nichts im Repo
- [ ] `security-exceptions.json`: keine abgelaufenen Ausnahmen
- [ ] Backup vorhanden, Wiederherstellung dieses Jahr getestet
- [ ] Tag `vX.Y.Z` gesetzt, Build/Deploy aus dem Tag
