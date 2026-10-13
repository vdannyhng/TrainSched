import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card } from '@/components/ui';

import { useStudentHomework } from '../api';
import { HomeworkItem } from './HomeworkItem';

/** Lehreransicht im Schülerprofil: offene Hausaufgaben, erledigte einblendbar. */
export function StudentHomeworkCard({ studentId, today }: { studentId: string; today: string }) {
  const { t } = useTranslation();
  const homework = useStudentHomework(studentId);
  const [showDone, setShowDone] = useState(false);
  const all = homework.data ?? [];
  const open = all.filter((h) => h.status === 'open');
  const done = all.filter((h) => h.status === 'done');

  if (all.length === 0) return null;
  return (
    <Card title={t('homework.title')}>
      {open.length === 0 ? <AppText tone="muted">{t('homework.noneOpen')}</AppText> : null}
      {open.map((h) => (
        <HomeworkItem key={h.id} homework={h} today={today} canDelete />
      ))}
      {showDone ? done.map((h) => <HomeworkItem key={h.id} homework={h} today={today} canDelete />) : null}
      {done.length > 0 ? (
        <Button
          title={showDone ? t('homework.hideDone') : `${t('homework.showDone')} (${done.length})`}
          variant="ghost"
          onPress={() => setShowDone((v) => !v)}
        />
      ) : null}
    </Card>
  );
}
