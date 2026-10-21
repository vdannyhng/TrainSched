import type { AppLocale } from '@/i18n';

import { PRIVACY_POLICY_VERSION } from '../auth/api';

/**
 * Datenschutzerklärung (Markdown light pro Abschnitt). Massgeblich ist die deutsche Fassung;
 * `docs/PRIVACY.md` enthält denselben Text (Test prüft die Abschnitte).
 * Bei inhaltlichen Änderungen PRIVACY_POLICY_VERSION erhöhen → alle werden erneut gefragt.
 *
 * Platzhalter in [eckigen Klammern] vor dem Release ersetzen.
 */
export type PolicySection = { title: string; body: string };
export type Policy = { title: string; version: string; intro: string; sections: PolicySection[] };

export const PROVIDER = {
  name: '[Name des Anbieters]',
  address: '[Strasse Nr., PLZ Ort, Land]',
  email: '[kontakt@beispiel.ch]',
};

const de: Policy = {
  title: 'Datenschutzerklärung',
  version: PRIVACY_POLICY_VERSION,
  intro:
    'TrainSched ist eine App zur Organisation von Nachhilfe- und Sprachunterricht. Wir erheben nur die Daten, die dafür nötig sind. Es gibt keine Werbung, kein Tracking und keinen Verkauf von Daten.',
  sections: [
    {
      title: '1. Verantwortlich',
      body: `${PROVIDER.name}\n${PROVIDER.address}\nE-Mail: ${PROVIDER.email}\n\nFür die Daten ihrer Schülerinnen und Schüler ist zusätzlich die jeweilige Lehrkraft verantwortlich, die diese Daten in der App erfasst.`,
    },
    {
      title: '2. Welche Daten wir verarbeiten',
      body: [
        '- **Konto:** E-Mail-Adresse, Name, Rolle, Zeitzone, Sprache. Das Passwort wird nur verschlüsselt (gehasht) gespeichert.',
        '- **Schülerdaten (von der Lehrkraft erfasst):** Name, Kontaktdaten, Sprachniveau und dessen Verlauf, Lernziel, Themen; bei Minderjährigen Kontakt der Erziehungsberechtigten und deren Einwilligung.',
        '- **Unterricht:** Termine, Anwesenheit, Absagen, Verschiebe- und Absage-Anfragen, Notizen, Hausaufgaben.',
        '- **Dateien:** Fotos, PDFs und Audiodateien, die an Termine oder Schüler angehängt werden.',
        '- **Benachrichtigungen:** ein Gerätekennzeichen (Push-Token) und der Gerätetyp, falls Benachrichtigungen erlaubt wurden.',
        '- **Technische Daten:** Beim Zugriff verarbeitet der Hosting-Anbieter IP-Adresse und Zeitpunkt, um den Dienst sicher zu betreiben.',
      ].join('\n'),
    },
    {
      title: '3. Zweck und Rechtsgrundlage',
      body: [
        'Die Daten dienen ausschliesslich der Organisation des Unterrichts: Termine planen, Unterricht dokumentieren, Lernfortschritt zeigen, an Termine erinnern.',
        '',
        'Rechtsgrundlage ist das Unterrichtsverhältnis (Vertragserfüllung) bzw. das berechtigte Interesse an einer geordneten Unterrichtsorganisation. Push-Benachrichtigungen erhältst du nur mit deiner Einwilligung, die du in den Geräteeinstellungen jederzeit widerrufen kannst. Es gelten das Schweizer Datenschutzgesetz (DSG) und, soweit anwendbar, die DSGVO.',
      ].join('\n'),
    },
    {
      title: '4. Wer die Daten sieht',
      body: [
        '- **Lehrkräfte** sehen nur ihre eigenen Schülerinnen und Schüler. Die Admin-Person verwaltet die Lehrkräfte und kann alle Daten einsehen.',
        '- **Schülerinnen und Schüler** sehen nur ihre eigenen Termine sowie Notizen und Dateien, die ausdrücklich für sie freigegeben sind. Bei Gruppenterminen sehen sie die anderen Teilnehmenden nicht.',
        '- Diese Rechte werden auf dem Server durchgesetzt, nicht nur in der App.',
      ].join('\n'),
    },
    {
      title: '5. Dienstleister (Auftragsverarbeiter)',
      body: [
        '- **Supabase** (Datenbank, Dateispeicher, Anmeldung). Die Daten liegen in einem Rechenzentrum in der EU.',
        '- **Expo / 650 Industries, USA** (Zustellung von Push-Benachrichtigungen). Übermittelt werden nur Gerätekennzeichen sowie Titel und Kurztext der Benachrichtigung (z. B. „Termin verschoben“ mit Datum), keine Notizinhalte.',
        '- **Apple und Google** stellen Push-Benachrichtigungen auf die Geräte zu.',
        '',
        'Für Übermittlungen in die USA stützen wir uns auf die Standardvertragsklauseln der EU bzw. die vom EDÖB anerkannten Garantien.',
      ].join('\n'),
    },
    {
      title: '6. Speicherdauer und Löschung',
      body: [
        'Daten werden gespeichert, solange das Konto bzw. das Unterrichtsverhältnis besteht.',
        '',
        '- **Konto löschen:** in der App unter Konto → „Konto löschen“. Die Löschung ist sofort und endgültig.',
        '- **Schülerinnen und Schüler:** Das Löschen entfernt den App-Zugang. Die Unterrichtsdaten, die die Lehrkraft erfasst hat, bleiben bei ihr, bis sie den Schüler löscht; sie wird über die Löschung informiert. Du kannst die Lehrkraft jederzeit bitten, alles zu löschen.',
        '- **Lehrkräfte:** Das Löschen entfernt das Konto mit allen Schülern, Terminen, Notizen, Dateien und den App-Zugängen der eigenen Schüler.',
        '',
        'Sicherungskopien des Hosting-Anbieters werden nach dessen Fristen automatisch überschrieben.',
      ].join('\n'),
    },
    {
      title: '7. Deine Rechte',
      body: [
        'Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Widerspruch und Datenübertragbarkeit.',
        '',
        '- **Auskunft und Datenübertragung:** in der App unter Konto → „Meine Daten exportieren“ (JSON-Datei mit Download-Links zu deinen Dateien).',
        '- **Löschung:** in der App unter Konto → „Konto löschen“.',
        `- Für alles andere: ${PROVIDER.email}`,
        '',
        'Du kannst dich bei der zuständigen Aufsichtsbehörde beschweren, in der Schweiz beim Eidgenössischen Datenschutz- und Öffentlichkeitsbeauftragten (EDÖB).',
      ].join('\n'),
    },
    {
      title: '8. Minderjährige',
      body: 'Für Schülerinnen und Schüler unter 16 Jahren erfasst die Lehrkraft die Einwilligung der Erziehungsberechtigten, bevor ein App-Zugang erstellt wird.',
    },
    {
      title: '9. Sicherheit',
      body: 'Alle Verbindungen sind verschlüsselt (HTTPS). Zugriffsrechte werden serverseitig geprüft. Dateien liegen in einem privaten Speicher und sind nur über zeitlich begrenzte Links abrufbar. Ein Zugang ist nur mit persönlicher Einladung möglich.',
    },
    {
      title: '10. Änderungen',
      body: 'Wenn sich diese Erklärung inhaltlich ändert, fragt die App beim nächsten Öffnen erneut nach deiner Zustimmung.',
    },
  ],
};

const vi: Policy = {
  title: 'Chính sách bảo mật',
  version: PRIVACY_POLICY_VERSION,
  intro:
    'TrainSched là ứng dụng để tổ chức các buổi học kèm và học ngoại ngữ. Chúng tôi chỉ thu thập những dữ liệu cần thiết cho mục đích này. Không có quảng cáo, không theo dõi và không bán dữ liệu. (Bản dịch tham khảo – bản tiếng Đức có giá trị pháp lý.)',
  sections: [
    {
      title: '1. Bên chịu trách nhiệm',
      body: `${PROVIDER.name}\n${PROVIDER.address}\nE-mail: ${PROVIDER.email}\n\nĐối với dữ liệu của học viên, giáo viên nhập dữ liệu đó vào ứng dụng cũng là bên chịu trách nhiệm.`,
    },
    {
      title: '2. Dữ liệu được xử lý',
      body: [
        '- **Tài khoản:** e-mail, tên, vai trò, múi giờ, ngôn ngữ. Mật khẩu chỉ được lưu dưới dạng mã hóa (hash).',
        '- **Dữ liệu học viên (do giáo viên nhập):** tên, thông tin liên hệ, trình độ và tiến trình, mục tiêu học, chủ đề; với trẻ vị thành niên: liên hệ và sự đồng ý của phụ huynh.',
        '- **Buổi học:** lịch học, chuyên cần, buổi hủy, yêu cầu dời/hủy, ghi chú, bài tập về nhà.',
        '- **Tệp:** ảnh, PDF và tệp âm thanh được đính kèm vào buổi học hoặc học viên.',
        '- **Thông báo:** mã thiết bị (push token) và loại thiết bị, nếu bạn cho phép thông báo.',
        '- **Dữ liệu kỹ thuật:** khi truy cập, nhà cung cấp hosting xử lý địa chỉ IP và thời điểm để vận hành dịch vụ an toàn.',
      ].join('\n'),
    },
    {
      title: '3. Mục đích và cơ sở pháp lý',
      body: [
        'Dữ liệu chỉ dùng để tổ chức việc học: lên lịch, ghi chép buổi học, hiển thị tiến độ, nhắc lịch.',
        '',
        'Cơ sở pháp lý là quan hệ học tập (thực hiện hợp đồng) hoặc lợi ích chính đáng trong việc tổ chức buổi học. Thông báo đẩy chỉ được gửi khi bạn đồng ý; bạn có thể tắt bất cứ lúc nào trong cài đặt thiết bị. Áp dụng Luật Bảo vệ Dữ liệu Thụy Sĩ (DSG) và, nếu có, GDPR.',
      ].join('\n'),
    },
    {
      title: '4. Ai có thể xem dữ liệu',
      body: [
        '- **Giáo viên** chỉ thấy học viên của mình. Quản trị viên quản lý giáo viên và có thể xem toàn bộ dữ liệu.',
        '- **Học viên** chỉ thấy lịch học của mình cùng ghi chú và tệp được chia sẻ cho mình. Trong buổi học nhóm, học viên không thấy những người tham gia khác.',
        '- Các quyền này được kiểm soát trên máy chủ, không chỉ trong ứng dụng.',
      ].join('\n'),
    },
    {
      title: '5. Nhà cung cấp dịch vụ',
      body: [
        '- **Supabase** (cơ sở dữ liệu, lưu trữ tệp, đăng nhập). Dữ liệu được lưu tại trung tâm dữ liệu ở EU.',
        '- **Expo / 650 Industries, Hoa Kỳ** (gửi thông báo đẩy). Chỉ truyền mã thiết bị cùng tiêu đề và nội dung ngắn của thông báo (ví dụ „Buổi học đã được dời“ kèm ngày), không có nội dung ghi chú.',
        '- **Apple và Google** chuyển thông báo đến thiết bị.',
        '',
        'Đối với việc truyền dữ liệu sang Hoa Kỳ, chúng tôi dựa trên các điều khoản hợp đồng tiêu chuẩn của EU hoặc các bảo đảm được EDÖB công nhận.',
      ].join('\n'),
    },
    {
      title: '6. Thời gian lưu trữ và xóa',
      body: [
        'Dữ liệu được lưu trong thời gian tài khoản hoặc quan hệ học tập còn tồn tại.',
        '',
        '- **Xóa tài khoản:** trong ứng dụng tại Tài khoản → „Xóa tài khoản“. Việc xóa có hiệu lực ngay và không thể khôi phục.',
        '- **Học viên:** xóa tài khoản sẽ xóa quyền truy cập ứng dụng. Dữ liệu học tập do giáo viên ghi lại vẫn ở chỗ giáo viên cho đến khi giáo viên xóa học viên; giáo viên sẽ được thông báo. Bạn có thể yêu cầu giáo viên xóa toàn bộ bất cứ lúc nào.',
        '- **Giáo viên:** xóa tài khoản sẽ xóa toàn bộ học viên, lịch học, ghi chú, tệp và tài khoản ứng dụng của học viên mình.',
        '',
        'Bản sao lưu của nhà cung cấp hosting sẽ tự động bị ghi đè theo thời hạn của họ.',
      ].join('\n'),
    },
    {
      title: '7. Quyền của bạn',
      body: [
        'Bạn có quyền được biết, chỉnh sửa, xóa, hạn chế xử lý, phản đối và chuyển dữ liệu.',
        '',
        '- **Xem và chuyển dữ liệu:** trong ứng dụng tại Tài khoản → „Xuất dữ liệu của tôi“ (tệp JSON kèm liên kết tải tệp).',
        '- **Xóa:** trong ứng dụng tại Tài khoản → „Xóa tài khoản“.',
        `- Các yêu cầu khác: ${PROVIDER.email}`,
        '',
        'Bạn có thể khiếu nại với cơ quan giám sát có thẩm quyền, tại Thụy Sĩ là Ủy viên Liên bang về Bảo vệ Dữ liệu và Thông tin (EDÖB).',
      ].join('\n'),
    },
    {
      title: '8. Trẻ vị thành niên',
      body: 'Với học viên dưới 16 tuổi, giáo viên ghi nhận sự đồng ý của phụ huynh trước khi tạo tài khoản ứng dụng.',
    },
    {
      title: '9. Bảo mật',
      body: 'Mọi kết nối đều được mã hóa (HTTPS). Quyền truy cập được kiểm tra trên máy chủ. Tệp được lưu trong kho riêng tư và chỉ tải được qua liên kết có thời hạn. Chỉ có thể tạo tài khoản bằng lời mời cá nhân.',
    },
    {
      title: '10. Thay đổi',
      body: 'Khi nội dung chính sách này thay đổi, ứng dụng sẽ hỏi lại sự đồng ý của bạn ở lần mở tiếp theo.',
    },
  ],
};

export const POLICY: Record<AppLocale, Policy> = { de, vi };

/** Deutsche Fassung als Markdown (Quelle für docs/PRIVACY.md). */
export function policyMarkdown(policy: Policy = de): string {
  return [
    `# ${policy.title}`,
    '',
    `Version ${policy.version}`,
    '',
    policy.intro,
    '',
    // Einzelne Zeilenumbrüche (z. B. Adresse) als harte Umbrüche, Absätze und Listen unverändert
    ...policy.sections.flatMap((s) => [
      `## ${s.title}`,
      '',
      s.body.replace(/([^\n])\n(?=[^\n-])/g, '$1  \n'),
      '',
    ]),
  ].join('\n');
}
