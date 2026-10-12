import { DateTime, IANAZone } from 'luxon';

/** Häufige Zeitzonen der Schülerinnen und Schüler (Vorschläge im Formular). */
export const COMMON_TIMEZONES = [
  'Europe/Zurich',
  'Europe/Berlin',
  'Europe/Vienna',
  'Asia/Ho_Chi_Minh',
] as const;

export function isValidTimezone(zone: string): boolean {
  return IANAZone.isValidZone(zone);
}

/** Lesbarer Ortsname aus der IANA-Zone, z. B. „Ho Chi Minh“. */
export function timezoneCity(zone: string): string {
  const city = zone.split('/').pop() ?? zone;
  return city.replace(/_/g, ' ');
}

/** Aktuelle Uhrzeit in einer Zone, z. B. für „Jetzt 15:23 in Ho Chi Minh“. */
export function nowInZone(zone: string, locale: string, now: DateTime = DateTime.now()): string {
  return now.setZone(zone).setLocale(locale).toLocaleString(DateTime.TIME_SIMPLE);
}
