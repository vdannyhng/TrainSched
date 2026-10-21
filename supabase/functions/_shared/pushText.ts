// Push-Texte in der Sprache und Zeitzone des Empfängers. Reines TS ohne Abhängigkeiten,
// damit es in der Edge Function (Deno) und in Jest gleichermaßen läuft.

export type PushLocale = 'de' | 'vi';
export type PushKind =
  'reminder' | 'lesson_moved' | 'lesson_cancelled' | 'request_new' | 'request_decided' | 'account_deleted';

export type PushRow = {
  kind: PushKind;
  locale: PushLocale;
  timezone: string;
  recipient_role: 'admin' | 'teacher' | 'student';
  payload: {
    offset_min?: number;
    old_start?: string;
    accepted?: boolean;
    student_id?: string;
    student_name?: string;
  };
  lesson_id: string | null;
  request_id: string | null;
  lesson_start: string | null;
  lesson_label: string | null;
  request_kind: 'reschedule' | 'cancel' | null;
  student_name: string | null;
};

export type PushContent = { title: string; body: string; url: string };

const TEXT = {
  de: {
    lesson: 'Unterricht',
    reminder: (rel: string) => `Termin ${rel}`,
    moved: 'Termin verschoben',
    cancelled: 'Termin abgesagt',
    requestNew: (name: string) => `Neue Anfrage von ${name}`,
    reschedule: 'Verschieben',
    cancel: 'Absage',
    accepted: 'Anfrage angenommen',
    declined: 'Anfrage abgelehnt',
    accountDeleted: (name: string) => `${name} hat das App-Konto gelöscht`,
    accountDeletedBody: 'Die Schülerdaten bleiben bei dir, bis du sie löschst.',
    minutes: (n: number) => `in ${n} Min.`,
    hours: (n: number) => `in ${n} Std.`,
    days: (n: number) => (n === 1 ? 'morgen' : `in ${n} Tagen`),
  },
  vi: {
    lesson: 'Buổi học',
    reminder: (rel: string) => `Buổi học ${rel}`,
    moved: 'Buổi học đã được dời',
    cancelled: 'Buổi học đã bị hủy',
    requestNew: (name: string) => `Yêu cầu mới từ ${name}`,
    reschedule: 'Dời lịch',
    cancel: 'Hủy buổi',
    accepted: 'Yêu cầu đã được chấp nhận',
    declined: 'Yêu cầu bị từ chối',
    accountDeleted: (name: string) => `${name} đã xóa tài khoản ứng dụng`,
    accountDeletedBody: 'Dữ liệu học viên vẫn được giữ cho đến khi bạn xóa.',
    minutes: (n: number) => `sau ${n} phút`,
    hours: (n: number) => `sau ${n} giờ`,
    days: (n: number) => (n === 1 ? 'ngày mai' : `sau ${n} ngày`),
  },
} as const;

const INTL_LOCALE: Record<PushLocale, string> = { de: 'de-DE', vi: 'vi-VN' };

export function formatWhen(iso: string, locale: PushLocale, timeZone: string): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso));
}

function relative(offsetMin: number, locale: PushLocale): string {
  const t = TEXT[locale];
  if (offsetMin < 60) return t.minutes(offsetMin);
  if (offsetMin < 1440) return t.hours(Math.round(offsetMin / 60));
  return t.days(Math.round(offsetMin / 1440));
}

/** Ziel in der App beim Antippen. */
export function pushUrl(
  row: Pick<PushRow, 'kind' | 'recipient_role' | 'lesson_id' | 'request_id' | 'payload'>,
): string {
  if (row.kind === 'account_deleted' && row.payload.student_id) return `/student/${row.payload.student_id}`;
  if (row.recipient_role === 'student') return row.lesson_id ? `/my-lesson/${row.lesson_id}` : '/lessons';
  if (row.kind === 'request_new' && row.request_id) return `/request/${row.request_id}`;
  return row.lesson_id ? `/lesson/${row.lesson_id}` : '/today';
}

export function renderPush(row: PushRow): PushContent {
  const locale: PushLocale = row.locale === 'vi' ? 'vi' : 'de';
  const t = TEXT[locale];
  const label = row.lesson_label?.trim() || t.lesson;
  const when = row.lesson_start ? formatWhen(row.lesson_start, locale, row.timezone) : '';
  const labelWhen = when ? `${label} · ${when}` : label;
  const url = pushUrl(row);

  switch (row.kind) {
    case 'reminder':
      return { title: t.reminder(relative(row.payload.offset_min ?? 60, locale)), body: labelWhen, url };
    case 'lesson_moved': {
      const old = row.payload.old_start ? formatWhen(row.payload.old_start, locale, row.timezone) : '';
      return { title: t.moved, body: old && when ? `${label}: ${old} → ${when}` : labelWhen, url };
    }
    case 'lesson_cancelled':
      return { title: t.cancelled, body: labelWhen, url };
    case 'request_new': {
      const what = row.request_kind === 'cancel' ? t.cancel : t.reschedule;
      return { title: t.requestNew(row.student_name?.trim() || '…'), body: `${what}: ${labelWhen}`, url };
    }
    case 'request_decided':
      return { title: row.payload.accepted ? t.accepted : t.declined, body: labelWhen, url };
    case 'account_deleted':
      return {
        title: t.accountDeleted(row.payload.student_name?.trim() || '…'),
        body: t.accountDeletedBody,
        url,
      };
  }
}
