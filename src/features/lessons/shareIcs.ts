import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { buildIcs, type IcsEvent } from '@/lib/ics';

/** .ics-Datei erzeugen und über das System-Teilen-Menü anbieten (Web: Download). */
export async function shareIcs(fileName: string, events: IcsEvent[]): Promise<void> {
  const content = buildIcs(events);

  if (Platform.OS === 'web') {
    const blob = new Blob([content], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  await Sharing.shareAsync(file.uri, { mimeType: 'text/calendar', UTI: 'com.apple.ical.ics' });
}
