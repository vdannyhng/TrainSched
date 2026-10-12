/**
 * Minimaler iCalendar-Export (RFC 5545) für einzelne Termine.
 * Zeiten in UTC (…Z), daher ohne VTIMEZONE-Block – jeder Kalender rechnet selbst um.
 */
export type IcsEvent = {
  uid: string;
  start: string; // ISO UTC
  end: string;
  summary: string;
  description?: string;
  location?: string;
  url?: string;
  cancelled?: boolean;
};

function icsDate(iso: string): string {
  return new Date(iso)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

function escapeText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

/** Zeilen > 75 Oktette werden gefaltet (Fortsetzung beginnt mit Leerzeichen). */
function fold(line: string): string {
  const chars = Array.from(line);
  const out: string[] = [];
  let current = '';
  let bytes = 0;
  for (const ch of chars) {
    const size = new TextEncoder().encode(ch).length;
    if (bytes + size > 75) {
      out.push(current);
      current = ' ';
      bytes = 1;
    }
    current += ch;
    bytes += size;
  }
  out.push(current);
  return out.join('\r\n');
}

export function buildIcs(events: IcsEvent[], now: Date = new Date()): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TrainSched//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];
  for (const e of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.uid}@trainsched`,
      `DTSTAMP:${icsDate(now.toISOString())}`,
      `DTSTART:${icsDate(e.start)}`,
      `DTEND:${icsDate(e.end)}`,
      `SUMMARY:${escapeText(e.summary)}`,
    );
    if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`);
    if (e.location) lines.push(`LOCATION:${escapeText(e.location)}`);
    if (e.url) lines.push(`URL:${e.url}`);
    lines.push(`STATUS:${e.cancelled ? 'CANCELLED' : 'CONFIRMED'}`, 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
