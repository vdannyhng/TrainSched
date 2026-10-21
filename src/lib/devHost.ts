/**
 * Entwicklung: Die lokale Supabase läuft auf demselben Rechner wie der Expo-Dev-Server.
 * Zeigt die konfigurierte URL auf eine lokale/LAN-Adresse, wird der Host durch den des
 * Dev-Servers ersetzt – so funktioniert das Handy auch nach einem IP-Wechsel (DHCP, WLAN ↔ LAN).
 * Öffentliche Adressen (Supabase Cloud) bleiben unverändert.
 */
const LOCAL_HOST =
  /^(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/;

export function resolveDevSupabaseUrl(configured: string, devHost: string | null | undefined): string {
  if (!devHost) return configured;
  const url = new URL(configured);
  const host = devHost.replace(/:\d+$/, '');
  if (!LOCAL_HOST.test(url.hostname) || !LOCAL_HOST.test(host)) return configured;
  url.hostname = host;
  return url.toString().replace(/\/$/, '');
}
