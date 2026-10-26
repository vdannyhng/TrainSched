import type { AppLocale } from '@/i18n';

/**
 * Anleitung für Lehrkräfte und Schüler (Seite /anleitung).
 * Texte in „Markdown light“: **fett** markiert Beschriftungen aus der App, Listen mit „- “ bzw. „1. “.
 * Deutsch und Vietnamesisch müssen dieselbe Gliederung haben (Test: help/__tests__/guide-test.ts).
 * Beschriftungen bitte mit den Texten in src/i18n/locales/*.json abgleichen, wenn sich die App ändert.
 */
export type GuideRole = 'teacher' | 'student';
export type GuideSection = { title: string; body: string };
export type GuidePart = { title: string; intro: string; sections: GuideSection[] };
export type Guide = { title: string; intro: string; roleLabel: string; parts: Record<GuideRole, GuidePart> };

const de: Guide = {
  title: 'Anleitung',
  intro:
    'TrainSched hilft beim Organisieren von Nachhilfe- und Sprachunterricht: Termine planen, Notizen und Hausaufgaben festhalten und Verschiebungen absprechen. Die App läuft im Browser unter trainsched.expo.app und lässt sich wie eine App auf den Home-Bildschirm legen.',
  roleLabel: 'Anleitung für',
  parts: {
    teacher: {
      title: 'Lehrkräfte',
      intro: 'Die Abschnitte folgen dem Ablauf beim ersten Mal. Tippe auf einen Abschnitt, um ihn zu öffnen.',
      sections: [
        {
          title: 'Konto anlegen und anmelden',
          body: [
            '1. Du bekommst vom Admin einen Einladungslink oder einen Code (z. B. ABCD-EFGH). Der Code ist 14 Tage gültig und nur einmal verwendbar.',
            '2. Link öffnen – oder auf der Anmeldeseite **Ich habe einen Einladungscode** tippen und den Code eingeben.',
            '3. E-Mail und Passwort (mindestens 8 Zeichen, Buchstaben und Zahlen) eingeben → **Konto erstellen**.',
            '4. Beim ersten Mal die Datenschutzerklärung lesen und **Einverstanden** tippen.',
            '',
            'Später meldest du dich mit E-Mail und Passwort an. Passwort vergessen? Auf der Anmeldeseite **Passwort vergessen?** tippen.',
          ].join('\n'),
        },
        {
          title: 'Auf den Home-Bildschirm legen',
          body: [
            '- **iPhone:** trainsched.expo.app in Safari öffnen → Teilen-Symbol (Quadrat mit Pfeil) → **Zum Home-Bildschirm**.',
            '- **Android:** in Chrome öffnen → Menü ⋮ → **App installieren** bzw. **Zum Startbildschirm hinzufügen**.',
            '',
            'Danach erscheint das Symbol mit der vietnamesischen Flagge, und TrainSched öffnet sich ohne Browserleiste wie eine normale App.',
          ].join('\n'),
        },
        {
          title: 'Die fünf Bereiche',
          body: [
            '- **Heute:** Termine von heute und dieser Woche, mit Schnellaktionen',
            '- **Kalender:** Tag, Woche oder Monat; hier legst du auch private Zeiten (Blocker) an',
            '- **Schüler:** alle Schüler, Suche, Themen und Notizen durchsuchen',
            '- **Anfragen:** Wünsche zum Verschieben oder Absagen; eine Zahl zeigt offene Anfragen',
            '- **Konto:** Sprache, Pufferzeit, Benachrichtigungen, Datenschutz, diese Anleitung',
            '',
            'Die Sprache der App stellst du unter **Konto** → **Sprache** um.',
          ].join('\n'),
        },
        {
          title: 'Schüler anlegen',
          body: [
            '1. Reiter **Schüler** → oben rechts **+** (**Neuer Schüler**).',
            '2. Vorname eintragen. Alles andere ist freiwillig: Nachname, Kontakt, **Zeitzone** (wichtig für Schüler in Vietnam, z. B. Asia/Ho_Chi_Minh), Sprache, Niveau A1–B2, Lernziel, Themen.',
            '3. Bei Minderjährigen den Kontakt der Erziehungsberechtigten und deren Einwilligung eintragen.',
            '4. Speichern.',
            '',
            'Themen (z. B. Grammatik, Aussprache) verwaltest du im Reiter **Schüler** über das Etiketten-Symbol oben. Jedes Thema hat eine Farbe.',
          ].join('\n'),
        },
        {
          title: 'Schüler in die App einladen',
          body: [
            '1. Schüler öffnen → im Bereich **App-Zugang** auf **Einladung erstellen**.',
            '2. Über den Teilen-Knopf den Text mit Code und Link per WhatsApp, Zalo oder E-Mail schicken.',
            '3. Der Schüler öffnet den Link, legt ein Passwort fest und sieht danach nur seine eigenen Termine, Hausaufgaben und freigegebenen Materialien.',
            '',
            'Der Code wird aus Sicherheitsgründen nur einmal angezeigt. Ging er verloren: **Neuen Code erstellen**. Eine Einladung ist freiwillig – du kannst Schüler auch ohne App-Zugang führen.',
          ].join('\n'),
        },
        {
          title: 'Termine planen',
          body: [
            '1. Im Reiter **Heute** auf **+** tippen – oder beim Schüler **Termin planen**.',
            '2. Teilnehmende wählen. Mehrere Schüler ergeben einen Gruppentermin.',
            '3. Datum, Uhrzeit und **Dauer** festlegen.',
            '4. Wiederholung: **Einmalig**, **Wöchentlich** oder **Alle 2 Wochen**. Serien laufen weiter, bis du sie beendest.',
            '5. **Online** mit Link zum Online-Raum oder **Vor Ort** mit Ort.',
            '6. Speichern. Überschneidet sich etwas, warnt die App, und du entscheidest.',
            '',
            'Im **Kalender** geht es noch schneller: am Handy auf eine freie Zeit gedrückt halten und ziehen, am PC klicken oder mit der Maus ziehen.',
            '',
            'Wohnt ein Schüler in einer anderen Zeitzone, zeigt die App beide Uhrzeiten. Der Schüler sieht den Termin in seiner eigenen Zeit.',
          ].join('\n'),
        },
        {
          title: 'Private Zeiten blockieren',
          body: [
            'Arbeit, Arzt, Urlaub: Im **Kalender** einen Zeitraum ziehen → **Blocker anlegen**, einmalig oder wöchentlich. Schüler sehen Blocker nicht, aber beim Planen warnt dich die App.',
            '',
            'Unter **Konto** → **Pufferzeit zwischen Terminen** legst du die Mindestpause zwischen zwei Terminen fest.',
          ].join('\n'),
        },
        {
          title: 'Nach der Stunde',
          body: [
            '- **Gehalten:** auf der Terminkarte **Gehalten** tippen und die Anwesenheit wählen (**Anwesend**, **Entschuldigt**, **Gefehlt**). Daraus entsteht der Lernfortschritt.',
            '- **Notiz:** **Notiz** auf der Terminkarte, schreiben, **Notiz speichern**. Mit **Für Schüler sichtbar** sieht der Schüler sie, mit **Nur für dich** bleibt sie privat. Für fett ein Wort mit zwei Sternchen umschliessen, für kursiv mit einem, Listen mit „- “.',
            '- **Hausaufgabe:** Termin öffnen → **Hausaufgabe hinzufügen**, mit Fälligkeitsdatum. Der Schüler hakt sie ab.',
            '- **Dateien:** unter **Anhänge**: **Foto aufnehmen**, **Bild auswählen** oder **Datei (PDF, Audio)**, bis 20 MB.',
            '',
            'Auf jeder Terminseite steht **Letzte Stunde**: Notizen und Hausaufgaben vom letzten Mal auf einen Blick.',
          ].join('\n'),
        },
        {
          title: 'Termine verschieben oder absagen',
          body: [
            '- **Verschieben:** Termin öffnen → **Verschieben**, z. B. mit **+1 Woche**.',
            '- **Absagen:** **Absagen** und einen Grund angeben. Rückgängig mit **Absage zurücknehmen**.',
            '- **Serien:** Beim Bearbeiten fragt die App **Nur diesen Termin** oder **Diesen und alle folgenden**. **Serie ab hier beenden** stoppt die Serie.',
          ].join('\n'),
        },
        {
          title: 'Anfragen von Schülern beantworten',
          body: [
            'Schüler können eine Verschiebung (mit bis zu drei Vorschlägen) oder eine Absage anfragen. Offene Anfragen zeigt eine Zahl am Reiter **Anfragen**.',
            '',
            '1. Anfrage öffnen. Kurzfristige Anfragen nach Ablauf der Absagefrist sind rot markiert.',
            '2. Bei Verschiebung unter **Ersatztermin wählen** einen Vorschlag antippen. Die App zeigt **Frei** oder womit er sich überschneidet.',
            '3. Optional eine Antwort schreiben → **Annehmen** oder **Ablehnen**.',
            '',
            'Beim Annehmen wird der Termin automatisch verschoben bzw. abgesagt. Bei Gruppenterminen wird nur diese Person entschuldigt.',
          ].join('\n'),
        },
        {
          title: 'Lernfortschritt und Notizen finden',
          body: [
            'Beim Schüler zeigt **Lernfortschritt** für 3 Monate, 12 Monate oder gesamt:',
            '- Unterrichtsstunden und Anwesenheit',
            '- Absagequote, davon auf Anfrage und kurzfristig',
            '- Level-Verlauf (z. B. A1 → A2 → B1) und behandelte Themen',
            '',
            'Das Niveau änderst du beim Schüler unter **Bearbeiten**; der Verlauf wird automatisch gespeichert. **Notizen durchsuchen** (Blatt-Symbol oben im Reiter Schüler) findet auch ohne Akzente: „huong“ findet „Hương“.',
          ].join('\n'),
        },
        {
          title: 'Konto, Datenschutz und Zugänge',
          body: [
            '- **Zugang pausieren:** beim Schüler unter **App-Zugang** → **Zugang pausieren**. Die Daten bleiben erhalten.',
            '- **Schüler löschen:** Schüler → **Bearbeiten** → **Schüler löschen** – Notizen, Dateien und App-Zugang werden endgültig gelöscht.',
            '- **Daten exportieren:** **Konto** → **Meine Daten exportieren**.',
            '- **Konto löschen:** **Konto** → **Konto löschen** – löscht auch alle deine Schüler, Termine und Dateien. Vorher exportieren.',
            '',
            'Push-Benachrichtigungen gibt es erst in der späteren Handy-App aus dem App Store bzw. Play Store. Im Browser schaust du regelmässig in **Heute** und **Anfragen**.',
          ].join('\n'),
        },
      ],
    },
    student: {
      title: 'Schüler',
      intro: 'So nutzt du TrainSched als Schülerin oder Schüler.',
      sections: [
        {
          title: 'Einladung annehmen',
          body: [
            '1. Den Link deiner Lehrerin öffnen – oder auf der Anmeldeseite **Ich habe einen Einladungscode** tippen und den Code eingeben.',
            '2. E-Mail und Passwort (mindestens 8 Zeichen, Buchstaben und Zahlen) eingeben → **Konto erstellen**.',
            '3. Datenschutzerklärung lesen → **Einverstanden**.',
            '',
            'Tipp: Leg TrainSched auf den Home-Bildschirm. iPhone: Safari → Teilen → **Zum Home-Bildschirm**. Android: Chrome → ⋮ → **App installieren**.',
          ].join('\n'),
        },
        {
          title: 'Die vier Bereiche',
          body: [
            '- **Termine:** deine kommenden und vergangenen Stunden, in deiner Zeitzone',
            '- **Aufgaben:** deine Hausaufgaben, nach Fälligkeit sortiert',
            '- **Materialien:** Notizen und Dateien, die deine Lehrerin für dich freigibt',
            '- **Profil:** Kurs, Lernfortschritt, Sprache, Datenschutz, diese Anleitung',
          ].join('\n'),
        },
        {
          title: 'Eine Stunde ansehen',
          body: [
            'Tippe im Reiter **Termine** auf eine Stunde. Dort findest du:',
            '- Zeit und Ort, bei Online-Stunden **Online-Raum öffnen**',
            '- **Letzte Stunde:** was beim letzten Mal gemacht wurde',
            '- Notizen, Hausaufgaben und Dateien zu dieser Stunde',
            '- **In Kalender exportieren:** Termin in den Handy-Kalender übernehmen',
          ].join('\n'),
        },
        {
          title: 'Hausaufgaben abhaken',
          body: 'Im Reiter **Aufgaben** auf das Kästchen neben einer Aufgabe tippen, wenn du fertig bist. Deine Lehrerin sieht das sofort.',
        },
        {
          title: 'Stunde verschieben oder absagen',
          body: [
            '1. Stunde öffnen → **Verschieben oder absagen**.',
            '2. Verschieben: bis zu drei Ersatztermine vorschlagen (**Weiteren Vorschlag hinzufügen**). Die Zeiten gelten in deiner Zeitzone.',
            '3. Absage: kurz den Grund schreiben.',
            '4. **Anfrage senden**.',
            '',
            'Deine Lehrerin nimmt an oder lehnt mit einer Antwort ab – den Stand siehst du in der Stunde. Solange die Anfrage offen ist: **Anfrage zurückziehen**. Ist die Absagefrist vorbei, zeigt die App einen Hinweis; anfragen kannst du trotzdem.',
          ].join('\n'),
        },
        {
          title: 'Fortschritt, Sprache und Datenschutz',
          body: [
            '- Unter **Profil** siehst du deinen **Lernfortschritt**: Stunden, Anwesenheit, Level-Verlauf und Themen.',
            '- Sprache: **Profil** → **Sprache** → Deutsch oder Tiếng Việt.',
            '- **Meine Daten exportieren** lädt alle deine Daten als Datei herunter.',
            '- **Konto löschen** entfernt deinen App-Zugang sofort; deine Lehrerin wird informiert.',
          ].join('\n'),
        },
      ],
    },
  },
};

const vi: Guide = {
  title: 'Hướng dẫn',
  intro:
    'TrainSched giúp sắp xếp các buổi học kèm và học ngoại ngữ: lên lịch, ghi chú, giao bài tập và trao đổi khi cần dời hoặc hủy buổi. Ứng dụng chạy trên trình duyệt tại trainsched.expo.app và có thể thêm vào màn hình chính như một ứng dụng.',
  roleLabel: 'Hướng dẫn cho',
  parts: {
    teacher: {
      title: 'Giáo viên',
      intro: 'Các mục được sắp xếp theo thứ tự khi dùng lần đầu. Nhấn vào một mục để mở.',
      sections: [
        {
          title: 'Tạo tài khoản và đăng nhập',
          body: [
            '1. Quản trị viên sẽ gửi cho bạn một đường link mời hoặc một mã (ví dụ ABCD-EFGH). Mã có hiệu lực 14 ngày và chỉ dùng được một lần.',
            '2. Mở link – hoặc trên trang đăng nhập nhấn **Tôi có mã mời** và nhập mã.',
            '3. Nhập e-mail và mật khẩu (ít nhất 8 ký tự, gồm chữ và số) → **Tạo tài khoản**.',
            '4. Lần đầu, đọc chính sách bảo mật và nhấn **Đồng ý**.',
            '',
            'Những lần sau, đăng nhập bằng e-mail và mật khẩu. Quên mật khẩu? Nhấn **Quên mật khẩu?** trên trang đăng nhập.',
          ].join('\n'),
        },
        {
          title: 'Thêm vào màn hình chính',
          body: [
            '- **iPhone:** mở trainsched.expo.app bằng Safari → biểu tượng Chia sẻ (ô vuông có mũi tên) → **Thêm vào MH chính**.',
            '- **Android:** mở bằng Chrome → menu ⋮ → **Cài đặt ứng dụng** hoặc **Thêm vào màn hình chính**.',
            '',
            'Sau đó biểu tượng có lá cờ Việt Nam xuất hiện và TrainSched mở như một ứng dụng bình thường, không có thanh trình duyệt.',
          ].join('\n'),
        },
        {
          title: 'Năm mục chính',
          body: [
            '- **Hôm nay:** các buổi học hôm nay và tuần này, kèm thao tác nhanh',
            '- **Lịch:** xem theo ngày, tuần hoặc tháng; cũng là nơi thêm lịch bận riêng',
            '- **Học viên:** danh sách học viên, tìm kiếm, chủ đề và tìm ghi chú',
            '- **Yêu cầu:** yêu cầu dời hoặc hủy buổi; con số cho biết số yêu cầu đang chờ',
            '- **Tài khoản:** ngôn ngữ, thời gian nghỉ, thông báo, bảo mật, hướng dẫn này',
            '',
            'Đổi ngôn ngữ của ứng dụng tại **Tài khoản** → **Ngôn ngữ**.',
          ].join('\n'),
        },
        {
          title: 'Thêm học viên',
          body: [
            '1. Thẻ **Học viên** → nhấn **+** ở góc trên bên phải (**Học viên mới**).',
            '2. Nhập tên. Các mục khác không bắt buộc: họ, liên hệ, **múi giờ** (quan trọng với học viên ở Việt Nam, ví dụ Asia/Ho_Chi_Minh), ngôn ngữ, trình độ A1–B2, mục tiêu học, chủ đề.',
            '3. Với học viên chưa đủ tuổi, nhập thông tin liên hệ và sự đồng ý của phụ huynh.',
            '4. Lưu lại.',
            '',
            'Quản lý chủ đề (ví dụ ngữ pháp, phát âm) ở thẻ **Học viên** qua biểu tượng nhãn phía trên. Mỗi chủ đề có một màu riêng.',
          ].join('\n'),
        },
        {
          title: 'Mời học viên vào ứng dụng',
          body: [
            '1. Mở học viên → ở mục **Truy cập ứng dụng** nhấn **Tạo lời mời**.',
            '2. Dùng nút chia sẻ để gửi đoạn tin có mã và link qua Zalo, WhatsApp hoặc e-mail.',
            '3. Học viên mở link, đặt mật khẩu và sau đó chỉ thấy lịch học, bài tập và tài liệu được chia sẻ của riêng mình.',
            '',
            'Vì lý do bảo mật, mã chỉ hiển thị một lần. Nếu bị mất: **Tạo mã mới**. Mời vào ứng dụng là không bắt buộc – bạn vẫn quản lý được học viên không có tài khoản.',
          ].join('\n'),
        },
        {
          title: 'Lên lịch học',
          body: [
            '1. Ở thẻ **Hôm nay** nhấn **+** – hoặc ở trang học viên nhấn **Lên lịch học**.',
            '2. Chọn người tham gia. Chọn nhiều học viên là buổi học nhóm.',
            '3. Chọn ngày, giờ và **Thời lượng**.',
            '4. Lặp lại: **Một lần**, **Hằng tuần** hoặc **2 tuần một lần**. Chuỗi buổi học tiếp tục cho đến khi bạn kết thúc.',
            '5. **Online** với link phòng học, hoặc **Trực tiếp** với địa điểm.',
            '6. Lưu lại. Nếu trùng lịch, ứng dụng sẽ cảnh báo và bạn tự quyết định.',
            '',
            'Trong **Lịch** còn nhanh hơn: trên điện thoại nhấn giữ rồi kéo vào khoảng trống, trên máy tính nhấp hoặc kéo chuột.',
            '',
            'Nếu học viên ở múi giờ khác, ứng dụng hiển thị cả hai giờ. Học viên thấy buổi học theo giờ của mình.',
          ].join('\n'),
        },
        {
          title: 'Chặn thời gian bận riêng',
          body: [
            'Đi làm, đi khám, nghỉ phép: trong **Lịch** kéo chọn một khoảng thời gian → **Thêm lịch bận**, một lần hoặc hằng tuần. Học viên không thấy lịch bận, nhưng khi lên lịch ứng dụng sẽ cảnh báo.',
            '',
            'Tại **Tài khoản** → **Thời gian nghỉ giữa các buổi**, bạn chọn khoảng nghỉ tối thiểu giữa hai buổi học.',
          ].join('\n'),
        },
        {
          title: 'Sau buổi học',
          body: [
            '- **Đã học:** trên thẻ buổi học nhấn **Đã học** và chọn chuyên cần (**Có mặt**, **Có phép**, **Vắng**). Từ đó ứng dụng tính tiến độ học tập.',
            '- **Ghi chú:** nhấn **Ghi chú** trên thẻ buổi học, viết, rồi **Lưu ghi chú**. Chọn **Học viên xem được** để chia sẻ, hoặc **Chỉ mình bạn** để giữ riêng. Muốn in đậm thì đặt từ giữa hai cặp dấu sao, in nghiêng thì một dấu sao, danh sách bắt đầu bằng „- “.',
            '- **Bài tập:** mở buổi học → **Thêm bài tập**, kèm hạn nộp. Học viên đánh dấu khi làm xong.',
            '- **Tệp:** mục **Tệp đính kèm**: **Chụp ảnh**, **Chọn ảnh** hoặc **Tệp (PDF, âm thanh)**, tối đa 20 MB.',
            '',
            'Ở mỗi trang buổi học có mục **Buổi học trước**: ghi chú và bài tập lần trước, xem nhanh trong một phút.',
          ].join('\n'),
        },
        {
          title: 'Dời hoặc hủy buổi học',
          body: [
            '- **Dời lịch:** mở buổi học → **Dời lịch**, ví dụ với **+1 tuần**.',
            '- **Hủy:** nhấn **Hủy** và ghi lý do. Hoàn tác bằng **Khôi phục buổi học**.',
            '- **Chuỗi buổi học:** khi sửa, ứng dụng hỏi **Chỉ buổi này** hay **Buổi này và các buổi sau**. **Kết thúc chuỗi từ đây** để dừng chuỗi.',
          ].join('\n'),
        },
        {
          title: 'Trả lời yêu cầu của học viên',
          body: [
            'Học viên có thể xin dời buổi (kèm tối đa ba thời gian đề xuất) hoặc xin hủy. Số yêu cầu đang chờ hiện trên thẻ **Yêu cầu**.',
            '',
            '1. Mở yêu cầu. Yêu cầu sát giờ (sau hạn hủy) được đánh dấu màu đỏ.',
            '2. Với yêu cầu dời lịch, tại **Chọn thời gian thay thế** nhấn vào một đề xuất. Ứng dụng hiện **Trống** hoặc cho biết bị trùng với gì.',
            '3. Có thể viết câu trả lời → **Chấp nhận** hoặc **Từ chối**.',
            '',
            'Khi chấp nhận, buổi học tự động được dời hoặc hủy. Với buổi học nhóm, chỉ người đó được tính là có phép.',
          ].join('\n'),
        },
        {
          title: 'Tiến độ học tập và tìm ghi chú',
          body: [
            'Ở trang học viên, mục **Tiến độ học tập** hiển thị trong 3 tháng, 12 tháng hoặc tất cả:',
            '- Số giờ học và chuyên cần',
            '- Tỷ lệ hủy, trong đó theo yêu cầu và sát giờ',
            '- Tiến trình trình độ (ví dụ A1 → A2 → B1) và các chủ đề đã học',
            '',
            'Đổi trình độ của học viên tại **Sửa**; tiến trình được lưu tự động. **Tìm ghi chú** (biểu tượng tờ giấy phía trên thẻ Học viên) tìm được cả khi gõ không dấu: „huong“ tìm ra „Hương“.',
          ].join('\n'),
        },
        {
          title: 'Tài khoản, bảo mật và quyền truy cập',
          body: [
            '- **Tạm dừng truy cập:** ở trang học viên, mục **Truy cập ứng dụng** → **Tạm dừng truy cập**. Dữ liệu vẫn được giữ.',
            '- **Xóa học viên:** học viên → **Sửa** → xóa học viên – ghi chú, tệp và tài khoản ứng dụng bị xóa vĩnh viễn.',
            '- **Xuất dữ liệu:** **Tài khoản** → **Xuất dữ liệu của tôi**.',
            '- **Xóa tài khoản:** **Tài khoản** → **Xóa tài khoản** – xóa cả học viên, lịch học và tệp của bạn. Nên xuất dữ liệu trước.',
            '',
            'Thông báo đẩy chỉ có trong ứng dụng điện thoại sau này (App Store / Play Store). Trên trình duyệt, hãy thường xuyên xem **Hôm nay** và **Yêu cầu**.',
          ].join('\n'),
        },
      ],
    },
    student: {
      title: 'Học viên',
      intro: 'Cách dùng TrainSched dành cho học viên.',
      sections: [
        {
          title: 'Nhận lời mời',
          body: [
            '1. Mở link cô giáo gửi – hoặc trên trang đăng nhập nhấn **Tôi có mã mời** và nhập mã.',
            '2. Nhập e-mail và mật khẩu (ít nhất 8 ký tự, gồm chữ và số) → **Tạo tài khoản**.',
            '3. Đọc chính sách bảo mật → **Đồng ý**.',
            '',
            'Mẹo: thêm TrainSched vào màn hình chính. iPhone: Safari → Chia sẻ → **Thêm vào MH chính**. Android: Chrome → ⋮ → **Cài đặt ứng dụng**.',
          ].join('\n'),
        },
        {
          title: 'Bốn mục chính',
          body: [
            '- **Buổi học:** các buổi sắp tới và đã qua, theo giờ của bạn',
            '- **Bài tập:** bài tập về nhà, sắp xếp theo hạn nộp',
            '- **Tài liệu:** ghi chú và tệp cô giáo chia sẻ cho bạn',
            '- **Hồ sơ:** khóa học, tiến độ, ngôn ngữ, bảo mật, hướng dẫn này',
          ].join('\n'),
        },
        {
          title: 'Xem một buổi học',
          body: [
            'Ở thẻ **Buổi học**, nhấn vào một buổi. Bạn sẽ thấy:',
            '- Thời gian và địa điểm, với buổi online có nút **Mở phòng học online**',
            '- **Buổi học trước:** nội dung lần học trước',
            '- Ghi chú, bài tập và tệp của buổi này',
            '- **Xuất sang lịch:** thêm buổi học vào lịch điện thoại',
          ].join('\n'),
        },
        {
          title: 'Đánh dấu bài tập',
          body: 'Ở thẻ **Bài tập**, nhấn vào ô bên cạnh bài khi bạn làm xong. Cô giáo sẽ thấy ngay.',
        },
        {
          title: 'Xin dời hoặc hủy buổi học',
          body: [
            '1. Mở buổi học → **Dời hoặc hủy buổi học**.',
            '2. Dời lịch: đề xuất tối đa ba thời gian thay thế (**Thêm đề xuất**). Thời gian tính theo múi giờ của bạn.',
            '3. Hủy buổi: viết ngắn gọn lý do.',
            '4. **Gửi yêu cầu**.',
            '',
            'Cô giáo sẽ chấp nhận hoặc từ chối kèm lời nhắn – bạn xem trạng thái ngay trong buổi học. Khi yêu cầu còn đang chờ: **Rút lại yêu cầu**. Nếu đã quá hạn hủy, ứng dụng sẽ báo; bạn vẫn có thể gửi yêu cầu.',
          ].join('\n'),
        },
        {
          title: 'Tiến độ, ngôn ngữ và bảo mật',
          body: [
            '- Ở **Hồ sơ** bạn xem **Tiến độ học tập**: số giờ học, chuyên cần, tiến trình trình độ và chủ đề.',
            '- Ngôn ngữ: **Hồ sơ** → **Ngôn ngữ** → Deutsch hoặc Tiếng Việt.',
            '- **Xuất dữ liệu của tôi** tải toàn bộ dữ liệu của bạn về dưới dạng tệp.',
            '- **Xóa tài khoản** xóa quyền truy cập ứng dụng ngay; cô giáo sẽ được thông báo.',
          ].join('\n'),
        },
      ],
    },
  },
};

export const GUIDE: Record<AppLocale, Guide> = { de, vi };
